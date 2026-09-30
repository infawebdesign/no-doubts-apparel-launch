import { squareJson, squareSettings, sha256 } from "./square-config.server.ts";
import {
  decryptToken,
  encryptToken,
  importEncryptionKey,
  getValidSquareAccessToken,
  type SquareEnv,
} from "./square-oauth.server.ts";

const HOUR = 3_600_000;
const RETRY_WINDOW = 23 * HOUR; // Stop before Resend's 24-hour idempotency guarantee expires.
import { validEmail } from "./shipping.ts";
type Shipment = {
  uid?: string;
  type?: string;
  state?: string;
  shipment_details?: {
    shipped_at?: string;
    carrier?: string;
    tracking_number?: string;
    tracking_url?: string;
    recipient?: { email_address?: string };
  };
};
type ShippingOrder = {
  id?: string;
  reference_id?: string;
  location_id?: string;
  state?: string;
  fulfillments?: Shipment[];
  tenders?: { payment_id?: string; id?: string }[];
};
type Email = {
  from: string;
  to: string[];
  reply_to: string;
  subject: string;
  text: string;
  html: string;
};
type Row = {
  notification_id: string;
  order_id: string;
  fulfillment_uid: string;
  payload_ciphertext: string;
  payload_iv: string;
  first_attempt_at: number | null;
  attempts: number;
  created_at: number;
};

export function shippingEmailsEnabled(env: SquareEnv) {
  return (
    env.SHIPPING_EMAILS_ENABLED === "true" &&
    Number.isFinite(Date.parse(env.SHIPPING_EMAILS_START_AT ?? ""))
  );
}
function sender(env: SquareEnv) {
  if (
    !validEmail(env.SHIPPING_EMAIL_FROM) ||
    !env.RESEND_API_KEY ||
    !env.SQUARE_TOKEN_ENCRYPTION_KEY
  )
    throw new Error("Shipping email configuration incomplete");
  return `No Doubts Apparel <${env.SHIPPING_EMAIL_FROM}>`;
}
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!,
  );
export function trackingLink(details: NonNullable<Shipment["shipment_details"]>) {
  if (details.tracking_url) {
    try {
      const url = new URL(details.tracking_url);
      if (url.protocol === "https:" && !url.username && !url.password) return url.href;
    } catch {
      /* Use carrier fallback below. */
    }
  }
  if (details.tracking_number && /canada\s*post/i.test(details.carrier ?? ""))
    return `https://www.canadapost-postescanada.ca/track-reperage/en#/details/${encodeURIComponent(details.tracking_number)}`;
  return null;
}
export function shippingEmail(
  from: string,
  to: string,
  reference: string,
  details: NonNullable<Shipment["shipment_details"]>,
): Email {
  const tracking = details.tracking_number!.trim();
  const carrier = details.carrier?.trim() || "Your shipping carrier";
  const link = trackingLink(details);
  const ref = reference.slice(0, 8).toUpperCase();
  const text = `Your No Doubts Apparel order has shipped!\n\nOrder reference: ${ref}\nCarrier: ${carrier}\nTracking number: ${tracking}${link ? `\nTrack your shipment: ${link}` : "\nUse this tracking number on your carrier's website."}\n\nTracking updates may take time to appear after the carrier receives the parcel.\n\nQuestions? Reply to this email.\nNo Doubts Apparel`;
  const html = `<h1>Your order has shipped!</h1><p>Your No Doubts Apparel order is on its way.</p><p>Order reference: <strong>${escapeHtml(ref)}</strong><br>Carrier: ${escapeHtml(carrier)}<br>Tracking number: <strong>${escapeHtml(tracking)}</strong></p>${link ? `<p><a href="${escapeHtml(link)}">Track your shipment</a></p>` : "<p>Use this tracking number on your carrier's website.</p>"}<p>Tracking updates may take time to appear after the carrier receives the parcel.</p><p>Questions? Reply to this email.</p><p>No Doubts Apparel</p>`;
  return {
    from,
    to: [to],
    reply_to: "nodoubts.ca@gmail.com",
    subject: `Your No Doubts Apparel order ${ref} has shipped`,
    text,
    html,
  };
}
async function loadOrder(env: SquareEnv, orderId: string) {
  const access = await getValidSquareAccessToken(env);
  if (!access.ok) throw new Error("Shipping order lookup unavailable");
  const { order } = await squareJson<{ order?: ShippingOrder }>(
    env,
    access.accessToken,
    `/v2/orders/${encodeURIComponent(orderId)}`,
  );
  return { order, token: access.accessToken };
}

// Only authenticated Square state for a locally verified website order can produce an email.
export async function queueShippingEmails(env: SquareEnv, attemptId: string, now = Date.now()) {
  if (!shippingEmailsEnabled(env)) return;
  const from = sender(env);
  const db = env.SQUARE_DB!;
  const config = squareSettings(env);
  const attempt = await db
    .prepare(
      "SELECT order_id, paid_at, verified_status FROM checkout_attempts WHERE attempt_id = ? AND merchant_id = ? AND location_id = ? AND environment = ?",
    )
    .bind(attemptId, config.merchantId, config.locationId, env.SQUARE_ENVIRONMENT)
    .first<{ order_id: string | null; paid_at: number | null; verified_status: string | null }>();
  if (!attempt?.order_id || !attempt.paid_at || attempt.verified_status !== "paid") return;
  const { order, token } = await loadOrder(env, attempt.order_id);
  if (
    order?.id !== attempt.order_id ||
    order.reference_id !== attemptId ||
    order.location_id !== config.locationId ||
    order.state === "CANCELED"
  )
    return;
  for (const fulfillment of order.fulfillments ?? []) {
    const details = fulfillment.shipment_details;
    if (
      !fulfillment.uid ||
      fulfillment.type !== "SHIPMENT" ||
      fulfillment.state !== "COMPLETED" ||
      !details
    )
      continue;
    const shipped = Date.parse(details.shipped_at ?? "");
    if (
      !Number.isFinite(shipped) ||
      shipped < Date.parse(env.SHIPPING_EMAILS_START_AT!) ||
      shipped > now + 300_000
    )
      continue;
    const id = await sha256(`shipping-v1:${config.merchantId}:${order.id}:${fulfillment.uid}`);
    const prior = await db
      .prepare("SELECT state FROM shipping_emails WHERE notification_id = ?")
      .bind(id)
      .first<{ state: string }>();
    if (prior && prior.state !== "waiting") continue;
    let email = details.recipient?.email_address;
    if (!validEmail(email)) {
      // Legacy checkouts did not collect a separate shipment email. Use only a
      // completed payment that belongs to this exact order and merchant location.
      const emails = new Set<string>();
      for (const tender of (order.tenders ?? []).slice(0, 10)) {
        const paymentId = tender.payment_id ?? tender.id;
        if (!paymentId) continue;
        const { payment } = await squareJson<{
          payment?: {
            id?: string;
            order_id?: string;
            location_id?: string;
            status?: string;
            buyer_email_address?: string;
          };
        }>(env, token, `/v2/payments/${encodeURIComponent(paymentId)}`);
        if (
          payment?.id === paymentId &&
          payment.order_id === order.id &&
          payment.location_id === config.locationId &&
          payment.status === "COMPLETED" &&
          validEmail(payment.buyer_email_address)
        )
          emails.add(payment.buyer_email_address);
      }
      email = emails.size === 1 ? [...emails][0] : undefined;
    }
    const problem = !validEmail(email)
      ? "missing_email"
      : !details.tracking_number?.trim()
        ? "missing_tracking"
        : null;
    let encrypted: { ciphertext: string; iv: string } | undefined;
    if (!problem)
      encrypted = await encryptToken(
        await importEncryptionKey(env.SQUARE_TOKEN_ENCRYPTION_KEY!),
        JSON.stringify(shippingEmail(from, email!, attemptId, details)),
      );
    await db
      .prepare(
        `INSERT INTO shipping_emails (notification_id, order_id, fulfillment_uid, state, payload_ciphertext, payload_iv, created_at, next_attempt_at, problem)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(notification_id) DO UPDATE SET state=excluded.state, payload_ciphertext=excluded.payload_ciphertext, payload_iv=excluded.payload_iv, problem=excluded.problem WHERE shipping_emails.state='waiting'`,
      )
      .bind(
        id,
        order.id,
        fulfillment.uid,
        problem ? "waiting" : "queued",
        encrypted?.ciphertext ?? null,
        encrypted?.iv ?? null,
        now,
        now,
        problem,
      )
      .run();
    if (problem)
      console.error("[shipping-email] order requires attention", { notificationId: id, problem });
  }
}

export async function deliverShippingEmails(env: SquareEnv, now = Date.now(), limit = 10) {
  if (!shippingEmailsEnabled(env)) return;
  sender(env);
  const db = env.SQUARE_DB!;
  // Keep non-PII tombstones for the lifetime of the local order cache.
  await db
    .prepare("DELETE FROM shipping_emails WHERE created_at < ?")
    .bind(now - 100 * 24 * HOUR)
    .run();
  for (let i = 0; i < limit; i++) {
    const row = await db
      .prepare(
        `UPDATE shipping_emails SET lease_until=?, attempts=attempts+1
      WHERE notification_id=(SELECT notification_id FROM shipping_emails WHERE state='queued' AND next_attempt_at<=? AND lease_until<=? ORDER BY next_attempt_at LIMIT 1)
      RETURNING *`,
      )
      .bind(now + 120_000, now, now)
      .first<Row>();
    if (!row) break;
    if (now - (row.first_attempt_at ?? row.created_at) >= RETRY_WINDOW) {
      await db
        .prepare(
          "UPDATE shipping_emails SET state='review', problem='delivery_uncertain', payload_ciphertext=NULL, payload_iv=NULL, lease_until=0 WHERE notification_id=?",
        )
        .bind(row.notification_id)
        .run();
      console.error("[shipping-email] delivery requires manual review", {
        notificationId: row.notification_id,
      });
      continue;
    }
    try {
      // Recheck before sending; never send a pending notification for a canceled shipment.
      const source = await db
        .prepare("SELECT verified_status FROM checkout_attempts WHERE order_id=?")
        .bind(row.order_id)
        .first<{ verified_status: string }>();
      const { order } = await loadOrder(env, row.order_id);
      const fulfillment = order?.fulfillments?.find((f) => f.uid === row.fulfillment_uid);
      if (
        source?.verified_status !== "paid" ||
        !order ||
        order.id !== row.order_id ||
        order.location_id !== squareSettings(env).locationId ||
        order.state === "CANCELED" ||
        fulfillment?.state !== "COMPLETED"
      ) {
        await db
          .prepare(
            "UPDATE shipping_emails SET state='canceled', payload_ciphertext=NULL, payload_iv=NULL, lease_until=0 WHERE notification_id=?",
          )
          .bind(row.notification_id)
          .run();
        continue;
      }
      const email = JSON.parse(
        await decryptToken(
          await importEncryptionKey(env.SQUARE_TOKEN_ENCRYPTION_KEY!),
          row.payload_ciphertext,
          row.payload_iv,
        ),
      ) as Email;
      // Start the idempotency clock immediately before the first network attempt.
      await db
        .prepare(
          "UPDATE shipping_emails SET first_attempt_at=COALESCE(first_attempt_at, ?) WHERE notification_id=?",
        )
        .bind(now, row.notification_id)
        .run();
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `shipment/${row.notification_id}`,
        },
        body: JSON.stringify(email),
      });
      const result = (await response.json().catch(() => null)) as { id?: string } | null;
      if (!response.ok || !result?.id) throw new Error("Email provider did not confirm acceptance");
      await db
        .prepare(
          "UPDATE shipping_emails SET state='sent', provider_id=?, sent_at=?, payload_ciphertext=NULL, payload_iv=NULL, lease_until=0, problem=NULL WHERE notification_id=?",
        )
        .bind(result.id, now, row.notification_id)
        .run();
    } catch {
      // Never log addresses, message contents, credentials, or provider responses.
      await db
        .prepare(
          "UPDATE shipping_emails SET lease_until=0, next_attempt_at=?, problem='retry_pending' WHERE notification_id=?",
        )
        .bind(now + Math.min(HOUR, 60_000 * 2 ** Math.min(row.attempts, 6)), row.notification_id)
        .run();
      console.error("[shipping-email] retry scheduled", { notificationId: row.notification_id });
    }
  }
}
