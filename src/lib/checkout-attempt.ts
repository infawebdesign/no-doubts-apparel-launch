import {
  CHECKOUT_STORAGE_KEY,
  parseCart,
  validAttempt,
  type PaymentLine,
} from "./payment-contract.ts";
import type { Shipping } from "./shipping.ts";

export type CheckoutAttempt = { attemptId: string; cart: string };
let memory: CheckoutAttempt | null = null;

export function checkoutAttempt(
  items: PaymentLine[],
  storage?: Pick<Storage, "getItem" | "setItem">,
  shippingFingerprint = "",
): CheckoutAttempt {
  const normalized = parseCart({ items });
  if (!normalized) throw new Error("Please check the quantities in your bag.");
  const cart = JSON.stringify(normalized) + shippingFingerprint;
  let previous = memory;
  try {
    storage ??= window.localStorage;
    const raw = storage.getItem(CHECKOUT_STORAGE_KEY);
    if (raw) {
      const value = JSON.parse(raw);
      if (validAttempt(value?.attemptId) && typeof value.cart === "string") previous = value;
    }
  } catch {
    /* Keep a stable attempt in this tab when storage is unavailable. */
  }
  if (previous?.cart === cart) {
    memory = previous;
    return previous;
  }
  const result = { attemptId: crypto.randomUUID(), cart };
  memory = result;
  try {
    storage?.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(result));
  } catch {
    /* memory fallback */
  }
  return result;
}

export async function prepareCheckout(items: PaymentLine[], shipping: Shipping) {
  // Store only a digest of the address in the browser's retry record.
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(shipping)),
  );
  const fingerprint = Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  // Serializes creation across same-origin tabs where Web Locks is available.
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request("nd-checkout-attempt", () =>
      checkoutAttempt(items, undefined, fingerprint),
    );
  }
  return checkoutAttempt(items, undefined, fingerprint);
}

export function forgetCheckout(id: string) {
  if (memory?.attemptId === id) memory = null;
  try {
    const raw = localStorage.getItem(CHECKOUT_STORAGE_KEY);
    if (raw && JSON.parse(raw).attemptId === id) localStorage.removeItem(CHECKOUT_STORAGE_KEY);
  } catch {
    /* Storage can be unavailable. */
  }
}
