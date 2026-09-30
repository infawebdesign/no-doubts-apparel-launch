# Shipping notifications

Shipping notifications are disabled unless `SHIPPING_EMAILS_ENABLED=true` and
`SHIPPING_EMAILS_START_AT` is a valid ISO timestamp. Square remains the source of
truth for orders and fulfillment. Resend sends the transactional notification.

## Release

1. Apply `migrations/0004_shipping_emails.sql` to production D1 before enabling:
   `npx wrangler d1 migrations apply no-doubts-square --remote`.
2. Verify `nodoubts.ca` in Resend. Store a sending-only key restricted to that
   domain as the Cloudflare runtime secret `RESEND_API_KEY`. Never commit it.
3. Deploy the tested code. Set `SHIPPING_EMAIL_FROM=orders@nodoubts.ca` and
   `SHIPPING_EMAILS_START_AT` to the activation time, then enable with
   `SHIPPING_EMAILS_ENABLED=true`. Persist these nonsecret settings in the
   deployment configuration so a later deployment does not remove them.
4. In the existing Square production subscription, retain `payment.updated` and
   `refund.updated`, and add `order.updated` and `order.fulfillment.updated`.
   Keep the URL `https://nodoubts.ca/api/square/webhook` and existing signing key.
5. Confirm the five-minute scheduled trigger. Webhooks are the fast path; the
   scheduled sweep recovers missed events, checking up to 25 orders each run
   and revisiting an order no more frequently than hourly.
6. Test with an explicitly authorized recipient. A passing local test suite
   does not establish production email delivery. Confirm the actual recipient,
   reference, tracking and provider delivery status before declaring it live.

## Merchant workflow

For a paid website order, add its carrier and tracking number in Square, then
mark the shipment completed/shipped. The shipment must contain a `shipped_at`
timestamp at or after activation. One email is sent per completed fulfillment.
The customer can reply to `nodoubts.ca@gmail.com`.

New checkouts collect an email address and store it with Square's shipment.
Legacy orders can use the buyer email from a completed payment for that order
when exactly one valid address is available. No email is guessed. Missing email
or tracking leaves the notification waiting until the Square order is corrected.
Tracking edits after a notification is sent do not create a second email; send
corrections manually. Do not change real customer orders just to run a test.

## Delivery checks and recovery

Inspect counts without exposing customer data:

```sql
SELECT state, problem, COUNT(*) AS total
FROM shipping_emails GROUP BY state, problem;
SELECT notification_id, order_id, state, attempts, provider_id, problem
FROM shipping_emails WHERE state IN ('waiting', 'review');
```

`sent` means Resend accepted the message; use Resend's delivery activity to check
delivery or bounce status. The message body and recipient are encrypted while
queued and cleared when sent, canceled or moved to review. Records expire after
100 days. Never paste customer information, credentials or decrypted payloads
into logs or support messages.

Retries reuse the exact payload and idempotency key. Automatic retries stop
after 23 hours to stay inside Resend's 24-hour idempotency window. For `review`,
check Resend activity before deciding whether a manual resend is appropriate.
Do not delete/reset a record to force a resend: an earlier request may already
have delivered. `waiting` records need missing details corrected in Square.

To pause all email activity, set `SHIPPING_EMAILS_ENABLED=false`. This leaves
checkout and Square payments operating. Resume within the retry window or
review the queue first; do not move the activation time backward to backfill
historical orders without explicitly planning the recipients and duplicates.
