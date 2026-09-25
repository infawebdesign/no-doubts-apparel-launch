import { paymentJson, squareJson, squareSettings } from "./square-config.server.ts";
import { getSquareEnv, getValidSquareAccessToken, type SquareEnv } from "./square-oauth.server.ts";
import { statusHandler } from "./payment-handlers.server.ts";

const MAX_WEBHOOK_BYTES = 64 * 1024;
const SIGNATURE_HEADER = "x-square-hmacsha256-signature";
const EVENT_TYPES = new Set(["payment.updated", "refund.updated"]);

function decodeBase64(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return bytes.length === 32 ? bytes : null;
  } catch {
    return null;
  }
}

export async function verifySquareWebhookSignature(
  notificationUrl: string,
  body: string,
  signature: string,
  signatureKey: string,
) {
  const supplied = decodeBase64(signature);
  if (!supplied || !signatureKey) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signatureKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    supplied,
    new TextEncoder().encode(notificationUrl + body),
  );
}

async function rawBody(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return null;
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_WEBHOOK_BYTES) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_WEBHOOK_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(bytes);
}

type WebhookEvent = {
  event_id?: unknown;
  merchant_id?: unknown;
  type?: unknown;
  data?: {
    object?: {
      payment?: { order_id?: unknown };
      refund?: { order_id?: unknown; payment_id?: unknown };
    };
  };
};

async function eventOrderId(event: WebhookEvent, env: SquareEnv) {
  const candidate = event.data?.object?.payment?.order_id ?? event.data?.object?.refund?.order_id;
  if (typeof candidate === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(candidate)) return candidate;
  const paymentId = event.data?.object?.refund?.payment_id;
  if (typeof paymentId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(paymentId)) return null;
  const credentials = await getValidSquareAccessToken(env);
  if (!credentials.ok) throw new Error("Square credentials unavailable");
  const { payment } = await squareJson<{ payment?: { id?: string; order_id?: string } }>(
    env,
    credentials.accessToken,
    `/v2/payments/${encodeURIComponent(paymentId)}`,
  );
  return payment?.id === paymentId &&
    typeof payment.order_id === "string" &&
    /^[A-Za-z0-9_-]{1,128}$/.test(payment.order_id)
    ? payment.order_id
    : null;
}

export async function squareWebhookHandler(
  request: Request,
  env = undefined as SquareEnv | undefined,
) {
  env ??= await getSquareEnv();
  const db = env.SQUARE_DB;
  let settings;
  try {
    settings = squareSettings(env);
  } catch {
    return paymentJson({ error: "Webhook is not configured." }, 503);
  }
  if (!db || !env.SQUARE_WEBHOOK_SIGNATURE_KEY)
    return paymentJson({ error: "Webhook is not configured." }, 503);

  const body = await rawBody(request);
  if (body === null) return paymentJson({ error: "Invalid request." }, 400);
  const signature = request.headers.get(SIGNATURE_HEADER) ?? "";
  const notificationUrl = `${settings.origin}/api/square/webhook`;
  if (
    !(await verifySquareWebhookSignature(
      notificationUrl,
      body,
      signature,
      env.SQUARE_WEBHOOK_SIGNATURE_KEY,
    ))
  )
    return paymentJson({ error: "Invalid signature." }, 403);

  let event: WebhookEvent;
  try {
    event = JSON.parse(body) as WebhookEvent;
  } catch {
    return paymentJson({ error: "Invalid request." }, 400);
  }
  if (
    typeof event.event_id !== "string" ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(event.event_id) ||
    typeof event.merchant_id !== "string" ||
    typeof event.type !== "string"
  )
    return paymentJson({ error: "Invalid event." }, 400);
  // A Square application can serve more than one seller, and Square's test
  // payload uses a generic merchant. Authenticated events for other merchants
  // must be acknowledged without reading or changing this store's records.
  if (event.merchant_id !== settings.merchantId) return paymentJson({ received: true });
  if (!EVENT_TYPES.has(event.type)) return paymentJson({ received: true });

  const inserted = await db
    .prepare(
      "INSERT INTO square_webhook_events (event_id, event_type, received_at) VALUES (?, ?, ?) ON CONFLICT(event_id) DO NOTHING",
    )
    .bind(event.event_id, event.type, Date.now())
    .run();
  if ((inserted.meta?.changes ?? 0) === 0) {
    const prior = await db
      .prepare("SELECT processed_at FROM square_webhook_events WHERE event_id = ?")
      .bind(event.event_id)
      .first<{ processed_at: number | null }>();
    if (prior?.processed_at) return paymentJson({ received: true });
  }

  let orderId: string | null;
  try {
    orderId = await eventOrderId(event, env);
  } catch {
    console.error("[square] webhook order lookup unavailable");
    return paymentJson({ error: "Reconciliation unavailable." }, 503);
  }
  const attempt = orderId
    ? await db
        .prepare("SELECT attempt_id FROM checkout_attempts WHERE order_id = ? LIMIT 1")
        .bind(orderId)
        .first<{ attempt_id: string }>()
    : null;
  if (!attempt) {
    await db
      .prepare(
        "UPDATE square_webhook_events SET processed_at = ?, outcome = 'unmatched' WHERE event_id = ?",
      )
      .bind(Date.now(), event.event_id)
      .run();
    return paymentJson({ received: true });
  }

  const statusResponse = await statusHandler(
    new Request(`${settings.origin}/api/square/status?attempt=${attempt.attempt_id}`),
    env,
  );
  if (!statusResponse.ok) {
    console.error("[square] webhook reconciliation unavailable", { status: statusResponse.status });
    return paymentJson({ error: "Reconciliation unavailable." }, 503);
  }
  const result = (await statusResponse.json()) as { status?: string };
  const checkedAt = Date.now();
  const outcome = result.status ?? "unknown";
  await db
    .prepare(
      "UPDATE checkout_attempts SET checked_at = ?, verified_status = ? WHERE attempt_id = ?",
    )
    .bind(checkedAt, outcome, attempt.attempt_id)
    .run();
  await db
    .prepare("UPDATE square_webhook_events SET processed_at = ?, outcome = ? WHERE event_id = ?")
    .bind(checkedAt, outcome, event.event_id)
    .run();
  return paymentJson({ received: true });
}
