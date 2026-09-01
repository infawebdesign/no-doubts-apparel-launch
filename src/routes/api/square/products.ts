import { createFileRoute } from "@tanstack/react-router";

const SQUARE_CATALOG_URL =
  "https://connect.squareup.com/v2/catalog/list?types=ITEM,IMAGE";
const SQUARE_VERSION = "2026-08-19";

type SquareMoney = { amount?: number; currency?: string };

type SquareVariation = {
  id: string;
  item_variation_data?: {
    name?: string;
    price_money?: SquareMoney;
  };
};

type SquareItemObject = {
  type: string;
  id: string;
  item_data?: {
    name?: string;
    description?: string;
    image_ids?: string[];
    variations?: SquareVariation[];
  };
};

export const Route = createFileRoute("/api/square/products")({
  server: {
    handlers: {
      GET: async () => {
        const token = process.env["SQUARE_ACCESS_TOKEN"];
        if (!token) {
          return Response.json(
            { error: "Square integration is not configured on the server." },
            { status: 500 },
          );
        }

        let squareResponse: Response;
        try {
          squareResponse = await fetch(SQUARE_CATALOG_URL, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Square-Version": SQUARE_VERSION,
              "Content-Type": "application/json",
            },
          });
        } catch {
          return Response.json(
            { error: "Could not reach Square. Please try again later." },
            { status: 502 },
          );
        }

        const body = (await squareResponse.json().catch(() => null)) as
          | { objects?: SquareItemObject[]; errors?: unknown }
          | null;

        if (!squareResponse.ok) {
          return Response.json(
            { error: "Square returned an error.", square: body ?? null },
            { status: squareResponse.status },
          );
        }

        const items = (body?.objects ?? [])
          .filter((obj) => obj.type === "ITEM")
          .map((obj) => ({
            id: obj.id,
            name: obj.item_data?.name ?? null,
            description: obj.item_data?.description ?? null,
            imageIds: obj.item_data?.image_ids ?? [],
            variations: (obj.item_data?.variations ?? []).map((v) => ({
              id: v.id,
              name: v.item_variation_data?.name ?? null,
              priceAmount: v.item_variation_data?.price_money?.amount ?? null,
              currency: v.item_variation_data?.price_money?.currency ?? null,
            })),
          }));

        return Response.json({ items });
      },
    },
  },
});
