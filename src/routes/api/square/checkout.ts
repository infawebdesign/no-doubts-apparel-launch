import { createFileRoute } from "@tanstack/react-router";

import {
  SQUARE_VERSION,
  getSquareEnv,
  getValidSquareAccessToken,
} from "@/lib/square-oauth.server";

const SQUARE_CATALOG_BATCH_URL =
  "https://connect.squareup.com/v2/catalog/batch-retrieve";
const SQUARE_INVENTORY_URL =
  "https://connect.squareup.com/v2/inventory/counts/batch-retrieve";
const SQUARE_PAYMENT_LINKS_URL =
  "https://connect.squareup.com/v2/online-checkout/payment-links";

const REDIRECT_URL =
  "https://no-doubts-apparel-launchs.misty-poetry-98f7.workers.dev/order-confirmed";
const SUPPORT_EMAIL = "nodoubtsapparel.ca@gmail.com";

const MAX_QTY_PER_LINE = 10;
const MAX_LINES = 20;

type CartLine = { variationId: string; quantity: number };

type SquareApiError = {
  category?: string;
  code?: string;
  detail?: string;
  field?: string;
};

type DebugInfo = {
  stage: string;
  squareStatus?: number;
  squareCode?: string | null;
  squareCategory?: string | null;
  squareDetail?: string | null;
  squareField?: string | null;
  missing?: string;
};

function json(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

/** TEMPORARY DIAGNOSTICS: logs + returns a credential-free debug object. */
function squareFailure(
  stage: string,
  locationId: string | undefined,
  status: number | undefined,
  payload: unknown,
  extra?: Record<string, unknown>,
) {
  const errors = (payload as { errors?: SquareApiError[] } | null)?.errors ?? [];
  const first = errors[0] ?? {};
  const debug: DebugInfo = {
    stage,
    squareStatus: status,
    squareCode: first.code ?? null,
    squareCategory: first.category ?? null,
    squareDetail: first.detail ?? null,
    squareField: first.field ?? null,
  };
  console.error("[square-checkout] failure", {
    ...debug,
    hasLocationId: Boolean(locationId),
    locationId: locationId ?? null,
    allErrors: errors,
    ...extra,
  });
  return { debug };
}

function parseCart(raw: unknown): CartLine[] | null {
  if (!raw || typeof raw !== "object") return null;
  const items = (raw as { items?: unknown }).items;
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_LINES) {
    return null;
  }
  const merged = new Map<string, number>();
  for (const entry of items) {
    if (!entry || typeof entry !== "object") return null;
    const { variationId, quantity } = entry as {
      variationId?: unknown;
      quantity?: unknown;
    };
    if (typeof variationId !== "string" || variationId.trim().length === 0) {
      return null;
    }
    if (
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_QTY_PER_LINE
    ) {
      return null;
    }
    const id = variationId.trim();
    const next = (merged.get(id) ?? 0) + quantity;
    if (next > MAX_QTY_PER_LINE) return null;
    merged.set(id, next);
  }
  return [...merged].map(([variationId, quantity]) => ({ variationId, quantity }));
}

type SquareVariationObject = {
  id: string;
  type?: string;
  is_deleted?: boolean;
  present_at_all_locations?: boolean;
  present_at_location_ids?: string[];
  absent_at_location_ids?: string[];
  item_variation_data?: {
    name?: string;
    sellable?: boolean;
    price_money?: { amount?: number; currency?: string };
    location_overrides?: Array<{
      location_id?: string;
      track_inventory?: boolean;
      sold_out?: boolean;
    }>;
    track_inventory?: boolean;
  };
};

function availableAtLocation(
  obj: SquareVariationObject,
  locationId: string,
): boolean {
  if (obj.is_deleted) return false;
  if (obj.present_at_all_locations === false) {
    return (obj.present_at_location_ids ?? []).includes(locationId);
  }
  return !(obj.absent_at_location_ids ?? []).includes(locationId);
}

export const Route = createFileRoute("/api/square/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => null);
        const cart = parseCart(body);
        if (!cart) {
          return json({ error: "Your cart could not be read. Please try again." }, 400);
        }

        const env = await getSquareEnv();
        const locationId = env.SQUARE_LOCATION_ID;
        if (!locationId) {
          console.error("[square-checkout] failure", {
            stage: "configuration",
            missing: "SQUARE_LOCATION_ID",
            hasLocationId: false,
          });
          return json(
            {
              error: "Checkout is temporarily unavailable.",
              debug: { stage: "configuration", missing: "SQUARE_LOCATION_ID" },
            },
            503,
          );
        }

        const tokenResult = await getValidSquareAccessToken(env);
        if (!tokenResult.ok) {
          console.error("[square-checkout] failure", {
            stage: "configuration",
            missing: "SQUARE_OAUTH_TOKEN",
            tokenStatus: tokenResult.status,
            hasLocationId: true,
            locationId,
          });
          return json(
            {
              error: "Checkout is temporarily unavailable.",
              debug: { stage: "configuration", missing: "SQUARE_OAUTH_TOKEN" },
            },
            503,
          );
        }
        const { accessToken } = tokenResult;

        const headers = {
          Authorization: `Bearer ${accessToken}`,
          "Square-Version": SQUARE_VERSION,
          "Content-Type": "application/json",
        };

        // 1. Validate variations against the live catalog.
        let catalogObjects: SquareVariationObject[] = [];
        try {
          const res = await fetch(SQUARE_CATALOG_BATCH_URL, {
            method: "POST",
            headers,
            body: JSON.stringify({
              object_ids: cart.map((l) => l.variationId),
              include_deleted_objects: false,
            }),
          });
          const payload = (await res.json().catch(() => null)) as {
            objects?: SquareVariationObject[];
          } | null;
          if (!res.ok || !payload) {
            const { debug } = squareFailure(
              "catalog validation",
              locationId,
              res.status,
              payload,
              { requestedObjectIds: cart.map((l) => l.variationId) },
            );
            return json({ error: "Square is temporarily unavailable.", debug }, 503);
          }
          catalogObjects = payload.objects ?? [];
        } catch (error) {
          const { debug } = squareFailure(
            "catalog validation",
            locationId,
            undefined,
            null,
            { networkError: String(error) },
          );
          return json({ error: "Square is temporarily unavailable.", debug }, 503);
        }

        const byId = new Map(catalogObjects.map((o) => [o.id, o]));
        for (const line of cart) {
          const obj = byId.get(line.variationId);
          if (
            !obj ||
            obj.type !== "ITEM_VARIATION" ||
            !availableAtLocation(obj, locationId) ||
            obj.item_variation_data?.sellable === false
          ) {
            console.error("[square-checkout] failure", {
              stage: "catalog validation",
              reason: "variation unavailable at location",
              variationId: line.variationId,
              found: Boolean(obj),
              objectType: obj?.type ?? null,
              hasLocationId: true,
              locationId,
            });
            return json(
              {
                error: "One of the items in your bag is no longer available.",
                debug: {
                  stage: "catalog validation",
                  squareDetail: "variation unavailable at location",
                },
              },
              409,
            );
          }
          const override = obj.item_variation_data?.location_overrides?.find(
            (o) => o.location_id === locationId,
          );
          if (override?.sold_out) {
            return json({ error: "One of the items in your bag is sold out." }, 409);
          }
        }

        // 2. Revalidate inventory right before checkout.
        try {
          const res = await fetch(SQUARE_INVENTORY_URL, {
            method: "POST",
            headers,
            body: JSON.stringify({
              catalog_object_ids: cart.map((l) => l.variationId),
              location_ids: [locationId],
              states: ["IN_STOCK"],
            }),
          });
          const payload = (await res.json().catch(() => null)) as {
            counts?: Array<{
              catalog_object_id?: string;
              quantity?: string | number;
            }>;
          } | null;
          if (!res.ok || !payload) {
            const { debug } = squareFailure(
              "inventory validation",
              locationId,
              res.status,
              payload,
            );
            return json({ error: "Square is temporarily unavailable.", debug }, 503);
          }
          const counts = new Map<string, number>();
          for (const c of payload.counts ?? []) {
            if (!c.catalog_object_id) continue;
            const qty = Number(c.quantity ?? 0);
            if (Number.isFinite(qty)) {
              counts.set(c.catalog_object_id, qty);
            }
          }
          for (const line of cart) {
            const obj = byId.get(line.variationId);
            const override = obj?.item_variation_data?.location_overrides?.find(
              (o) => o.location_id === locationId,
            );
            const tracked =
              override?.track_inventory ??
              obj?.item_variation_data?.track_inventory ??
              counts.has(line.variationId);
            if (!tracked) continue;
            const available = counts.get(line.variationId) ?? 0;
            if (available <= 0) {
              return json(
                { error: "One of the items in your bag is sold out." },
                409,
              );
            }
            if (line.quantity > available) {
              return json(
                { error: "We do not have enough stock for one of your items." },
                409,
              );
            }
          }
        } catch (error) {
          const { debug } = squareFailure(
            "inventory validation",
            locationId,
            undefined,
            null,
            { networkError: String(error) },
          );
          return json({ error: "Square is temporarily unavailable.", debug }, 503);
        }

        // 3. Create the Square-hosted checkout link.
        const paymentLinkBody = {
          idempotency_key: crypto.randomUUID(),
          order: {
            location_id: locationId,
            line_items: cart.map((line) => ({
              catalog_object_id: line.variationId,
              quantity: String(line.quantity),
            })),
            pricing_options: { auto_apply_taxes: true },
          },
          checkout_options: {
            ask_for_shipping_address: true,
            allow_tipping: false,
            merchant_support_email: SUPPORT_EMAIL,
            redirect_url: REDIRECT_URL,
          },
        };

        try {
          const res = await fetch(SQUARE_PAYMENT_LINKS_URL, {
            method: "POST",
            headers,
            body: JSON.stringify(paymentLinkBody),
          });
          const payload = (await res.json().catch(() => null)) as {
            payment_link?: { url?: string; order_id?: string };
          } | null;
          const url = payload?.payment_link?.url;
          const orderId = payload?.payment_link?.order_id;
          if (!res.ok || !url || !orderId) {
            const { debug } = squareFailure(
              "CreatePaymentLink",
              locationId,
              res.status,
              payload,
              {
                // Safe request body: no credentials included.
                safeRequestBody: {
                  order: paymentLinkBody.order,
                  checkout_options: paymentLinkBody.checkout_options,
                },
                missingUrl: !url,
                missingOrderId: !orderId,
              },
            );
            return json(
              { error: "Checkout could not be started. Please try again.", debug },
              503,
            );
          }
          return json({ checkoutUrl: url, orderId }, 200);
        } catch (error) {
          const { debug } = squareFailure(
            "CreatePaymentLink",
            locationId,
            undefined,
            null,
            {
              networkError: String(error),
              safeRequestBody: {
                order: paymentLinkBody.order,
                checkout_options: paymentLinkBody.checkout_options,
              },
            },
          );
          return json({ error: "Square is temporarily unavailable.", debug }, 503);
        }
      },
    },
  },
});
