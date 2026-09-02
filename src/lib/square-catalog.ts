import { queryOptions } from "@tanstack/react-query";

/**
 * Client-side view of the server route /api/square/products.
 * The browser never talks to Square directly and never sees tokens.
 */
export type SquareVariation = {
  id: string;
  name: string | null;
  priceAmount: number | null;
  currency: string | null;
  inventoryQuantity: number | null;
  inStock: boolean;
};

export type SquareItem = {
  id: string;
  name: string | null;
  description: string | null;
  imageIds: string[];
  imageUrls: string[];
  variations: SquareVariation[];
};

export const STORE_ERROR_MESSAGE =
  "We're having trouble loading the store right now. Please try again shortly.";

async function fetchSquareCatalog(): Promise<SquareItem[]> {
  const res = await fetch("/api/square/products", {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(STORE_ERROR_MESSAGE);
  const body = (await res.json().catch(() => null)) as {
    items?: SquareItem[];
  } | null;
  if (!body?.items) throw new Error(STORE_ERROR_MESSAGE);
  return body.items;
}

export const squareCatalogQuery = queryOptions({
  queryKey: ["square", "catalog"],
  queryFn: fetchSquareCatalog,
  staleTime: 60_000,
  retry: 1,
});

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Match a website product to its Square item by the mapped Square name. */
export function findSquareItem(
  items: SquareItem[] | undefined,
  squareName: string,
): SquareItem | undefined {
  if (!items) return undefined;
  const target = normalize(squareName);
  return items.find((item) => item.name && normalize(item.name) === target);
}

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];

/**
 * Temporary website-level merchandising restriction: 3XL stays in Square
 * but must not be offered on the storefront until Francesco re-enables it.
 */
const HIDDEN_SIZES = new Set(["3XL"]);

export function isVariationHidden(name: string | null): boolean {
  return name != null && HIDDEN_SIZES.has(name.trim().toUpperCase());
}

/** Variations the storefront is allowed to sell right now. */
export function visibleVariations(
  item: SquareItem | undefined,
): SquareVariation[] {
  if (!item) return [];
  return item.variations.filter((v) => !isVariationHidden(v.name));
}

const sizeRank = (name: string | null) => {
  if (!name) return SIZE_ORDER.length;
  const idx = SIZE_ORDER.findIndex(
    (s) => s.toLowerCase() === name.trim().toLowerCase(),
  );
  return idx === -1 ? SIZE_ORDER.length : idx;
};

/** Variations sorted into the usual size run, excluding hidden sizes. */
export function sortedVariations(item: SquareItem | undefined) {
  return visibleVariations(item).sort(
    (a, b) => sizeRank(a.name) - sizeRank(b.name),
  );
}

/** Lowest live price across sellable variations, in cents. */
export function itemPriceAmount(item: SquareItem | undefined): number | null {
  const prices = visibleVariations(item)
    .map((v) => v.priceAmount)
    .filter((p): p is number => typeof p === "number");
  if (prices.length === 0) return null;
  return Math.min(...prices);
}

export function itemCurrency(item: SquareItem | undefined): string {
  return visibleVariations(item).find((v) => v.currency)?.currency ?? "CAD";
}

export function itemInStock(item: SquareItem | undefined): boolean {
  return visibleVariations(item).some((v) => v.inStock);
}
