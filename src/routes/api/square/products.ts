import { createFileRoute } from "@tanstack/react-router";

import {
  SQUARE_VERSION,
  getSquareEnv,
  getValidSquareAccessToken,
} from "@/lib/square-oauth.server";

const SQUARE_CATALOG_URL = "https://connect.squareup.com/v2/catalog/list";
const SQUARE_INVENTORY_URL =
  "https://connect.squareup.com/v2/inventory/counts/batch-retrieve";

type InventoryCount = {
  catalog_object_id?: string;
  state?: string;
  quantity?: string | number;
};

type SquareMoney = { amount?: number; currency?: string };

type SquareVariation = {
  id: string;
  item_variation_data?: {
    name?: string;
    price_money?: SquareMoney;
  };
};

type SquareCatalogObject = {
  type: string;
  id: string;
  item_data?: {
    name?: string;
    description?: string;
    image_ids?: string[];
    variations?: SquareVariation[];
  };
  image_data?: { url?: string };
};

export const Route = createFileRoute("/api/square/products")({
  server: {
    handlers: {
      GET: async () => {
        const env = await getSquareEnv();
        const tokenResult = await getValidSquareAccessToken(env);

        if (!tokenResult.ok) {
          return Response.json(tokenResult.payload, {
            status: tokenResult.status,
            headers: { "cache-control": "no-store" },
          });
        }

        const { accessToken } = tokenResult;

        const objects: SquareCatalogObject[] = [];
        let cursor: string | undefined;
        try {
          do {
            const url = new URL(SQUARE_CATALOG_URL);
            url.searchParams.set("types", "ITEM,IMAGE");
            if (cursor) url.searchParams.set("cursor", cursor);

            const res = await fetch(url.toString(), {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Square-Version": SQUARE_VERSION,
                "Content-Type": "application/json",
              },
            });
            const body = (await res.json().catch(() => null)) as {
              objects?: SquareCatalogObject[];
              cursor?: string;
            } | null;

            if (!res.ok) {
              return Response.json(
                { error: "Square returned an error." },
                { status: 502, headers: { "cache-control": "no-store" } },
              );
            }

            objects.push(...(body?.objects ?? []));
            cursor = body?.cursor;
          } while (cursor);
        } catch {
          return Response.json(
            { error: "Could not reach Square. Please try again later." },
            { status: 502, headers: { "cache-control": "no-store" } },
          );
        }

        // --- Inventory ---
        const variationIds = objects
          .filter((obj) => obj.type === "ITEM")
          .flatMap((obj) => obj.item_data?.variations ?? [])
          .map((v) => v.id);

        const inventoryByVariation = new Map<string, number>();
        if (variationIds.length > 0) {
          let inventoryCursor: string | undefined;
          do {
            const res = await fetch(SQUARE_INVENTORY_URL, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Square-Version": SQUARE_VERSION,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                catalog_object_ids: variationIds,
                states: ["IN_STOCK"],
                ...(inventoryCursor ? { cursor: inventoryCursor } : {}),
              }),
            });
            const body = (await res.json().catch(() => null)) as {
              counts?: InventoryCount[];
              cursor?: string;
            } | null;

            if (!res.ok) {
              return Response.json(
                { error: "Square returned an error." },
                { status: 502, headers: { "cache-control": "no-store" } },
              );
            }

            for (const count of body?.counts ?? []) {
              if (count.state !== "IN_STOCK" || !count.catalog_object_id)
                continue;
              const qty = Number(count.quantity);
              inventoryByVariation.set(
                count.catalog_object_id,
                Number.isFinite(qty) ? qty : 0,
              );
            }
            inventoryCursor = body?.cursor;
          } while (inventoryCursor);
        }

        const imageUrls = new Map<string, string>();
        for (const obj of objects) {
          if (obj.type === "IMAGE" && obj.image_data?.url) {
            imageUrls.set(obj.id, obj.image_data.url);
          }
        }

        const items = objects
          .filter((obj) => obj.type === "ITEM")
          .map((obj) => {
            const imageIds = obj.item_data?.image_ids ?? [];
            return {
              id: obj.id,
              name: obj.item_data?.name ?? null,
              description: obj.item_data?.description ?? null,
              imageIds,
              imageUrls: imageIds
                .map((id) => imageUrls.get(id))
                .filter((u): u is string => Boolean(u)),
              variations: (obj.item_data?.variations ?? []).map((v) => {
                const inventoryQuantity =
                  inventoryByVariation.get(v.id) ?? null;
                return {
                  id: v.id,
                  name: v.item_variation_data?.name ?? null,
                  priceAmount:
                    v.item_variation_data?.price_money?.amount ?? null,
                  currency:
                    v.item_variation_data?.price_money?.currency ?? null,
                  inventoryQuantity,
                  inStock: inventoryQuantity === null || inventoryQuantity > 0,
                };
              }),
            };
          });

        return Response.json(
          { items },
          { headers: { "cache-control": "no-store" } },
        );
      },
    },
  },
});
