import {
  CHECKOUT_STORAGE_KEY,
  parseCart,
  validAttempt,
  type PaymentLine,
} from "./payment-contract.ts";

export type CheckoutAttempt = { attemptId: string; cart: string };
let memory: CheckoutAttempt | null = null;

export function checkoutAttempt(
  items: PaymentLine[],
  storage?: Pick<Storage, "getItem" | "setItem">,
): CheckoutAttempt {
  const normalized = parseCart({ items });
  if (!normalized) throw new Error("Please check the quantities in your bag.");
  const cart = JSON.stringify(normalized);
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

export async function prepareCheckout(items: PaymentLine[]) {
  // Serializes creation across same-origin tabs where Web Locks is available.
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request("nd-checkout-attempt", () => checkoutAttempt(items));
  }
  return checkoutAttempt(items);
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
