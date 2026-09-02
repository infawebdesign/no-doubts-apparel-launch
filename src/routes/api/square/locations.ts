import { createFileRoute } from "@tanstack/react-router";

import {
  SQUARE_VERSION,
  getSquareEnv,
  getValidSquareAccessToken,
} from "@/lib/square-oauth.server";

const SQUARE_LOCATIONS_URL = "https://connect.squareup.com/v2/locations";

type SquareLocation = {
  id?: string;
  name?: string;
  status?: string;
  country?: string;
  currency?: string;
};

export const Route = createFileRoute("/api/square/locations")({
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

        let res: Response;
        try {
          res = await fetch(SQUARE_LOCATIONS_URL, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Square-Version": SQUARE_VERSION,
              "Content-Type": "application/json",
            },
          });
        } catch {
          return Response.json(
            { error: "Could not reach Square. Please try again later." },
            { status: 502, headers: { "cache-control": "no-store" } },
          );
        }

        const body = (await res.json().catch(() => null)) as {
          locations?: SquareLocation[];
        } | null;

        if (!res.ok || !body) {
          return Response.json(
            { error: "Square returned an error." },
            { status: 502, headers: { "cache-control": "no-store" } },
          );
        }

        const locations = (body.locations ?? []).map((loc) => ({
          id: loc.id ?? null,
          name: loc.name ?? null,
          status: loc.status ?? null,
          country: loc.country ?? null,
          currency: loc.currency ?? null,
        }));

        return Response.json(
          { locations },
          { headers: { "cache-control": "no-store" } },
        );
      },
    },
  },
});
