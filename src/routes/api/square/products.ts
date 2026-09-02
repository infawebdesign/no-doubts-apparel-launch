import { createFileRoute } from "@tanstack/react-router";

import {
  SQUARE_OAUTH_TOKEN_URL,
  SQUARE_VERSION,
  decryptToken,
  encryptToken,
  getSquareEnv,
  importEncryptionKey,
} from "@/lib/square-oauth.server";

const SQUARE_CATALOG_URL = "https://connect.squareup.com/v2/catalog/list";
const SQUARE_INVENTORY_URL =
  "https://connect.squareup.com/v2/inventory/counts/batch-retrieve";
const REFRESH_BUFFER_MS = 24 * 60 * 60 * 1000; // refresh 24h before expiry

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

type TokenRow = {
  merchant_id: string;
  access_token_ciphertext: string;
  access_token_iv: string;
  refresh_token_ciphertext: string;
  refresh_token_iv: string;
  expires_at: string | null;
};

function isExpiring(expiresAt: string | null): boolean {
  if (!expiresAt) return true;
  const ts = Date.parse(expiresAt);
  if (Number.isNaN(ts)) return true;
  return ts - Date.now() <= REFRESH_BUFFER_MS;
}

export const Route = createFileRoute("/api/square/products")({
  server: {
    handlers: {
      GET: async () => {
        const env = await getSquareEnv();
        if (!env.SQUARE_DB || !env.SQUARE_TOKEN_ENCRYPTION_KEY) {
          // Not an error condition: environments without the Square bindings
          // (e.g. local preview) simply have no catalog to serve.
          return Response.json(
            { configured: false, items: [] },
            { status: 200, headers: { "cache-control": "no-store" } },
          );
        }

        const row = await env.SQUARE_DB.prepare(
          `SELECT merchant_id, access_token_ciphertext, access_token_iv,
                  refresh_token_ciphertext, refresh_token_iv, expires_at
             FROM square_oauth_tokens
            ORDER BY updated_at DESC
            LIMIT 1`,
        ).first<TokenRow>();

        if (!row) {
          return Response.json(
            { configured: false, items: [] },
            { status: 200, headers: { "cache-control": "no-store" } },
          );
        }

        const key = await importEncryptionKey(env.SQUARE_TOKEN_ENCRYPTION_KEY);

        let accessToken: string;
        try {
          accessToken = await decryptToken(
            key,
            row.access_token_ciphertext,
            row.access_token_iv,
          );
        } catch {
          return Response.json(
            { error: "Square credentials could not be read." },
            { status: 503, headers: { "cache-control": "no-store" } },
          );
        }

        if (isExpiring(row.expires_at)) {
          if (!env.SQUARE_APP_ID || !env.SQUARE_APP_SECRET) {
            return Response.json(
              { error: "Square is not configured on the server." },
              { status: 503, headers: { "cache-control": "no-store" } },
            );
          }
          try {
            const refreshToken = await decryptToken(
              key,
              row.refresh_token_ciphertext,
              row.refresh_token_iv,
            );
            const res = await fetch(SQUARE_OAUTH_TOKEN_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Square-Version": SQUARE_VERSION,
              },
              body: JSON.stringify({
                client_id: env.SQUARE_APP_ID,
                client_secret: env.SQUARE_APP_SECRET,
                grant_type: "refresh_token",
                refresh_token: refreshToken,
              }),
            });
            const payload = (await res.json().catch(() => null)) as {
              access_token?: string;
              refresh_token?: string;
              expires_at?: string;
            } | null;

            if (res.ok && payload?.access_token) {
              const access = await encryptToken(key, payload.access_token);
              if (payload.refresh_token) {
                const refresh = await encryptToken(key, payload.refresh_token);
                await env.SQUARE_DB.prepare(
                  `UPDATE square_oauth_tokens
                      SET access_token_ciphertext = ?, access_token_iv = ?,
                          refresh_token_ciphertext = ?, refresh_token_iv = ?,
                          expires_at = ?, updated_at = datetime('now')
                    WHERE merchant_id = ?`,
                )
                  .bind(
                    access.ciphertext,
                    access.iv,
                    refresh.ciphertext,
                    refresh.iv,
                    payload.expires_at ?? "",
                    row.merchant_id,
                  )
                  .run();
              } else {
                await env.SQUARE_DB.prepare(
                  `UPDATE square_oauth_tokens
                      SET access_token_ciphertext = ?, access_token_iv = ?,
                          expires_at = ?, updated_at = datetime('now')
                    WHERE merchant_id = ?`,
                )
                  .bind(
                    access.ciphertext,
                    access.iv,
                    payload.expires_at ?? "",
                    row.merchant_id,
                  )
                  .run();
              }
              accessToken = payload.access_token;
            }
          } catch {
            // fall through and try the existing token
          }
        }

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
