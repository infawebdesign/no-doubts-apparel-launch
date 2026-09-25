import { getValidSquareAccessToken, type SquareEnv } from "./square-oauth.server.ts";
import { statusHandler } from "./payment-handlers.server.ts";
import { redactCheckout } from "./checkout-privacy.server.ts";

export async function maintainPayments(env: SquareEnv, now = Date.now()) {
  const db = env.SQUARE_DB;
  if (!db) throw new Error("Missing checkout database");
  // This is a short-lived checkout cache, not the merchant's accounting ledger.
  // Square remains the order, payment, refund, and fulfillment system of record.
  await db
    .prepare("DELETE FROM checkout_attempts WHERE created_at < ?")
    .bind(now - 90 * 86400000)
    .run();
  await db
    .prepare(
      "UPDATE checkout_attempts SET request_json = '{}' WHERE order_id IS NULL AND created_at < ?",
    )
    .bind(now - 86400000)
    .run();
  await db.prepare("DELETE FROM payment_rate_limits WHERE expires_at < ?").bind(now).run();
  for (let i = 0; i < 50; i++) {
    const row = await db
      .prepare(
        "SELECT attempt_id, request_json FROM checkout_attempts WHERE order_id IS NOT NULL AND json_extract(request_json, '$.privacy_version') IS NULL LIMIT 1",
      )
      .first<{ attempt_id: string; request_json: string }>();
    if (!row) break;
    await db
      .prepare("UPDATE checkout_attempts SET request_json = ? WHERE attempt_id = ?")
      .bind(await redactCheckout(row.request_json, env), row.attempt_id)
      .run();
  }
  const credentials = await getValidSquareAccessToken(env);
  if (!credentials.ok) throw new Error("Scheduled Square credential check failed");
  // Pull authenticated Square state even when the buyer never returns. Bounded
  // batches rotate oldest checks first and also pick up refunds after payment.
  // Webhooks provide the fast path; this bounded sweep is the independent
  // recovery path for missed deliveries, refunds, and buyer drop-off.
  for (let i = 0; i < 25; i++) {
    const row = await db
      .prepare(
        "SELECT attempt_id FROM checkout_attempts WHERE order_id IS NOT NULL AND (checked_at IS NULL OR checked_at < ?) ORDER BY COALESCE(checked_at, 0), created_at LIMIT 1",
      )
      .bind(now - 3600000)
      .first<{ attempt_id: string }>();
    if (!row) break;
    const response = await statusHandler(
      new Request(`${env.PUBLIC_SITE_URL}/api/square/status?attempt=${row.attempt_id}`),
      env,
    );
    const result = (await response.json()) as { status?: string };
    await db
      .prepare(
        "UPDATE checkout_attempts SET checked_at = ?, verified_status = ? WHERE attempt_id = ?",
      )
      .bind(now, response.ok ? (result.status ?? "unknown") : "unavailable", row.attempt_id)
      .run();
    if (!response.ok)
      console.error("[square] scheduled verification unavailable", { status: response.status });
  }
}
