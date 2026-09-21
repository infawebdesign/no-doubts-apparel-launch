import { STOREFRONT_SQUARE_NAMES } from "./payment-contract.ts";
import type { SquareEnv } from "./square-oauth.server.ts";
import { PaymentError, squareJson, squareSettings } from "./square-config.server.ts";

export type CatalogObject = {
  id: string;
  type?: string;
  version?: number;
  is_deleted?: boolean;
  present_at_all_locations?: boolean;
  present_at_location_ids?: string[];
  absent_at_location_ids?: string[];
  item_data?: {
    name?: string;
    description?: string;
    image_ids?: string[];
    variations?: CatalogObject[];
  };
  image_data?: { url?: string };
  item_variation_data?: {
    item_id?: string;
    name?: string;
    sellable?: boolean;
    track_inventory?: boolean;
    price_money?: { amount?: number; currency?: string };
    location_overrides?: {
      location_id?: string;
      track_inventory?: boolean;
      sold_out?: boolean;
      price_money?: { amount?: number; currency?: string };
    }[];
  };
};

export function atLocation(object: CatalogObject, locationId: string) {
  if (object.is_deleted || object.absent_at_location_ids?.includes(locationId)) return false;
  return (
    object.present_at_all_locations !== false ||
    Boolean(object.present_at_location_ids?.includes(locationId))
  );
}

export function variationDetails(
  variation: CatalogObject,
  locationId: string,
  counts: Map<string, number>,
) {
  const data = variation.item_variation_data;
  const override = data?.location_overrides?.find((item) => item.location_id === locationId);
  const money = override?.price_money ?? data?.price_money;
  const tracked = override?.track_inventory ?? data?.track_inventory ?? counts.has(variation.id);
  const quantity = tracked ? (counts.get(variation.id) ?? 0) : null;
  const sellable =
    atLocation(variation, locationId) &&
    data?.sellable !== false &&
    data?.name?.trim().toUpperCase() !== "3XL" &&
    money?.currency === "CAD" &&
    Number.isSafeInteger(money?.amount) &&
    (money?.amount ?? 0) > 0;
  return {
    sellable,
    quantity,
    inStock: sellable && !override?.sold_out && (quantity === null || quantity > 0),
    amount: money?.amount ?? null,
  };
}

export async function assertMerchantLocation(env: SquareEnv, token: string) {
  const config = squareSettings(env);
  const result = await squareJson<{
    location?: { id?: string; merchant_id?: string; status?: string; currency?: string };
  }>(env, token, `/v2/locations/${encodeURIComponent(config.locationId)}`);
  const location = result.location;
  if (
    location?.id !== config.locationId ||
    location.merchant_id !== config.merchantId ||
    location.status !== "ACTIVE" ||
    location.currency !== "CAD"
  ) {
    throw new PaymentError(503, "The store's payment connection needs attention.");
  }
}

export async function loadStore(env: SquareEnv, token: string) {
  const config = squareSettings(env);
  const objects: CatalogObject[] = [];
  let cursor: string | undefined;
  const seen = new Set<string>();
  do {
    const page = await squareJson<{ objects?: CatalogObject[]; cursor?: string }>(
      env,
      token,
      `/v2/catalog/list?types=ITEM,IMAGE${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    );
    objects.push(...(page.objects ?? []));
    cursor = page.cursor;
    if (objects.length > 5000 || (cursor && seen.has(cursor)) || seen.size >= 50)
      throw new PaymentError(503, "Catalog is temporarily unavailable.");
    if (cursor) seen.add(cursor);
  } while (cursor);
  // Names are the existing merchant-owned mapping. Fail closed if a mapping is ambiguous.
  const items = STOREFRONT_SQUARE_NAMES.flatMap((name) => {
    const matches = objects.filter(
      (o) => o.type === "ITEM" && !o.is_deleted && o.item_data?.name === name,
    );
    if (matches.length > 1) throw new PaymentError(503, "Catalog configuration needs attention.");
    return matches.filter((o) => atLocation(o, config.locationId));
  });
  const variations = items.flatMap((item) => item.item_data?.variations ?? []);
  const counts = new Map<string, number>();
  for (let offset = 0; offset < variations.length; offset += 100) {
    let inventoryCursor: string | undefined;
    const inventorySeen = new Set<string>();
    do {
      const page = await squareJson<{
        counts?: {
          catalog_object_id?: string;
          location_id?: string;
          state?: string;
          quantity?: string;
        }[];
        cursor?: string;
      }>(env, token, "/v2/inventory/counts/batch-retrieve", {
        catalog_object_ids: variations.slice(offset, offset + 100).map((v) => v.id),
        location_ids: [config.locationId],
        states: ["IN_STOCK"],
        ...(inventoryCursor ? { cursor: inventoryCursor } : {}),
      });
      for (const count of page.counts ?? []) {
        if (
          count.location_id !== config.locationId ||
          count.state !== "IN_STOCK" ||
          !count.catalog_object_id
        )
          continue;
        const value = Number(count.quantity);
        counts.set(count.catalog_object_id, Number.isFinite(value) && value >= 0 ? value : 0);
      }
      inventoryCursor = page.cursor;
      if ((inventoryCursor && inventorySeen.has(inventoryCursor)) || inventorySeen.size >= 50)
        throw new PaymentError(503, "Inventory is temporarily unavailable.");
      if (inventoryCursor) inventorySeen.add(inventoryCursor);
    } while (inventoryCursor);
  }
  return { items, objects, variations, counts };
}

export function publicStore(store: Awaited<ReturnType<typeof loadStore>>, locationId: string) {
  const imageMap = new Map(
    store.objects.filter((o) => o.type === "IMAGE").map((o) => [o.id, o.image_data?.url]),
  );
  return store.items.map((item) => ({
    id: item.id,
    name: item.item_data?.name ?? null,
    description: item.item_data?.description ?? null,
    imageIds: item.item_data?.image_ids ?? [],
    imageUrls: (item.item_data?.image_ids ?? [])
      .map((id) => imageMap.get(id))
      .filter((url): url is string => Boolean(url?.startsWith("https://"))),
    variations: (item.item_data?.variations ?? []).flatMap((variation) => {
      const detail = variationDetails(variation, locationId, store.counts);
      if (!detail.sellable) return [];
      return [
        {
          id: variation.id,
          name: variation.item_variation_data?.name ?? null,
          priceAmount: detail.amount,
          currency: "CAD",
          inStock: detail.inStock,
        },
      ];
    }),
  }));
}
