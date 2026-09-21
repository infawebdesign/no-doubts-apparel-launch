export const MAX_QTY_PER_LINE = 10;
export const MAX_LINES = 20;
export const CHECKOUT_STORAGE_KEY = "nd-checkout-v3";
export const STOREFRONT_SQUARE_NAMES = [
  "Earn Your Total",
  "Hit the Standard",
  "Varsity",
  "OG",
] as const;
export type PaymentLine = { variationId: string; quantity: number };

export function parseCart(raw: unknown): PaymentLine[] | null {
  if (!raw || typeof raw !== "object") return null;
  const items = (raw as { items?: unknown }).items;
  if (!Array.isArray(items) || !items.length || items.length > MAX_LINES) return null;
  const merged = new Map<string, number>();
  for (const item of items) {
    if (!item || typeof item !== "object") return null;
    const { variationId, quantity } = item;
    if (typeof variationId !== "string" || !/^[A-Za-z0-9_-]{1,192}$/.test(variationId)) return null;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_LINE) return null;
    const count = (merged.get(variationId) ?? 0) + quantity;
    if (count > MAX_QTY_PER_LINE) return null;
    merged.set(variationId, count);
  }
  return [...merged]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([variationId, quantity]) => ({ variationId, quantity }));
}

export const validAttempt = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export function squareCheckoutUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      [
        "square.link",
        "checkout.square.site",
        "sandbox.square.link",
        "checkout.squareupsandbox.com",
      ].includes(url.hostname)
    );
  } catch {
    return false;
  }
}
