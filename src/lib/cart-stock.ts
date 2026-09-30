import { MAX_QTY_PER_LINE } from "./payment-contract.ts";

export function stockLimit(availableQuantity: number | null | undefined) {
  if (availableQuantity === undefined) return 0;
  if (availableQuantity === null) return MAX_QTY_PER_LINE;
  return Number.isFinite(availableQuantity)
    ? Math.max(0, Math.min(MAX_QTY_PER_LINE, Math.floor(availableQuantity)))
    : 0;
}

export function stockMessage(name: string, size: string, quantity: number, available: number) {
  const label = size ? `${name} / ${size}` : name;
  if (available <= 0) return `${label} is no longer available. Please remove it from your bag.`;
  return `Only ${available} of ${label} ${available === 1 ? "is" : "are"} available.${quantity > available ? ` Reduce your quantity from ${quantity} to ${available}.` : ""}`;
}
