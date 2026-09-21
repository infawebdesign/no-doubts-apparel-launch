import { fromBase64, safeEqual, toBase64, type SquareEnv } from "./square-oauth.server.ts";
import { hasExpectedShipping, type shippingOrderFields } from "./shipping.ts";

type ShippingOrder = ReturnType<typeof shippingOrderFields>;
type Snapshot = {
  order: ShippingOrder & { metadata?: { shipping_fingerprint?: string } };
  privacy_version?: number;
  address_hmac?: string;
  [key: string]: unknown;
};
const addressKeys = [
  "address_line_1",
  "address_line_2",
  "locality",
  "administrative_district_level_1",
  "postal_code",
  "country",
];
async function addressDigest(address: Record<string, unknown>, env: SquareEnv) {
  if (!env.SQUARE_TOKEN_ENCRYPTION_KEY) throw new Error("Missing verification key");
  const key = await crypto.subtle.importKey(
    "raw",
    fromBase64(env.SQUARE_TOKEN_ENCRYPTION_KEY) as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const normalized = addressKeys.map((key) =>
    typeof address[key] === "string"
      ? (address[key] as string).trim().replace(/\s+/g, " ").toUpperCase()
      : "",
  );
  const bytes = new TextEncoder().encode("checkout-address-v1:" + JSON.stringify(normalized));
  return toBase64(new Uint8Array(await crypto.subtle.sign("HMAC", key, bytes)));
}

// Square retains the fulfillment record. Keep only a keyed comparison value in
// our successful checkout snapshot, not another copy of the customer's address.
export async function redactCheckout(raw: string, env: SquareEnv): Promise<string> {
  const snapshot = JSON.parse(raw) as Snapshot;
  if (snapshot.privacy_version === 1) return raw;
  if (snapshot.order?.metadata?.shipping_fingerprint) {
    const recipient = snapshot.order.fulfillments[0]!.shipment_details.recipient;
    snapshot.address_hmac = await addressDigest(recipient.address, env);
    recipient.display_name = "";
    recipient.address = {} as typeof recipient.address;
  }
  snapshot.privacy_version = 1;
  return JSON.stringify(snapshot);
}

export async function verifyStoredShipping(
  order: unknown,
  raw: string,
  env: SquareEnv,
): Promise<boolean> {
  const snapshot = JSON.parse(raw) as Snapshot;
  if (!snapshot.order?.metadata?.shipping_fingerprint) return true; // pre-shipping legacy orders
  const expected = snapshot.order;
  if (snapshot.privacy_version === 1) {
    const address = (order as ShippingOrder | undefined)?.fulfillments?.[0]?.shipment_details
      ?.recipient?.address;
    if (
      !address ||
      !snapshot.address_hmac ||
      !safeEqual(await addressDigest(address, env), snapshot.address_hmac)
    )
      return false;
    expected.fulfillments[0]!.shipment_details.recipient.address = address;
  }
  return hasExpectedShipping(order, expected);
}
