import type { SquareEnv } from "./square-oauth.server.ts";

export class PaymentError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function squareSettings(env: SquareEnv) {
  if (
    !env.SQUARE_MERCHANT_ID ||
    !env.SQUARE_LOCATION_ID ||
    !env.PUBLIC_SITE_URL ||
    !["production", "sandbox"].includes(env.SQUARE_ENVIRONMENT ?? "")
  ) {
    throw new PaymentError(503, "Checkout is temporarily unavailable.");
  }
  const url = new URL(env.PUBLIC_SITE_URL);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    (url.protocol !== "https:" &&
      !(
        env.SQUARE_ENVIRONMENT === "sandbox" &&
        url.hostname === "localhost" &&
        url.protocol === "http:"
      ))
  ) {
    throw new PaymentError(503, "Checkout is temporarily unavailable.");
  }
  return {
    origin: url.origin,
    api:
      env.SQUARE_ENVIRONMENT === "production"
        ? "https://connect.squareup.com"
        : "https://connect.squareupsandbox.com",
    merchantId: env.SQUARE_MERCHANT_ID,
    locationId: env.SQUARE_LOCATION_ID,
  };
}

export function checkSite(request: Request, env: SquareEnv, mutation = false) {
  const settings = squareSettings(env);
  if (new URL(request.url).origin !== settings.origin)
    throw new PaymentError(403, "Checkout is not available on this address.");
  if (
    mutation &&
    (request.headers.get("origin") !== settings.origin ||
      request.headers.get("sec-fetch-site") === "cross-site")
  ) {
    throw new PaymentError(403, "Please start checkout from our website.");
  }
  return settings;
}

export function paymentJson(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store", "referrer-policy": "no-referrer", ...extra },
  });
}

export function paymentFailure(error: unknown) {
  if (error instanceof PaymentError) return paymentJson({ error: error.message }, error.status);
  // Never log tokens, authorization headers, raw responses, or customer details.
  console.error("[square] request failed", {
    type: error instanceof Error ? error.name : "unknown",
    frames:
      error instanceof Error
        ? error.stack
            ?.split("\n")
            .filter((line) => /^\s+at /.test(line))
            .slice(0, 4)
        : [],
  });
  return paymentJson({ error: "Square is temporarily unavailable. Please try again." }, 503);
}

export async function boundedJson(request: Request, maximum = 8192): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    throw new PaymentError(415, "A JSON request is required.");
  if (Number(request.headers.get("content-length")) > maximum)
    throw new PaymentError(413, "The request is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new PaymentError(400, "The request could not be read.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maximum) {
        await reader.cancel();
        throw new PaymentError(413, "The request is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new PaymentError(400, "The request could not be read.");
  }
}

export async function squareJson<T>(
  env: SquareEnv,
  accessToken: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${squareSettings(env).api}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Square-Version": "2026-08-19",
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(12_000),
    redirect: "manual",
  });
  if (!res.ok) {
    console.error("[square] API unavailable", { status: res.status });
    throw new PaymentError(503, "Square is temporarily unavailable. Please try again.");
  }
  return (await res.json()) as T;
}

export async function sha256(value: string) {
  const bytes = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
