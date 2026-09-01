import { createFileRoute } from "@tanstack/react-router";

import {
  SQUARE_OAUTH_AUTHORIZE_URL,
  SQUARE_SCOPES,
  getSquareEnv,
  htmlResponse,
  randomState,
  stateCookie,
} from "@/lib/square-oauth.server";

export const Route = createFileRoute("/api/square/oauth/start")({
  server: {
    handlers: {
      GET: async () => {
        const env = await getSquareEnv();
        if (!env.SQUARE_APP_ID) {
          return htmlResponse(
            "Square not configured",
            "The Square application ID is missing on the server.",
            500,
          );
        }

        const state = randomState();
        const url = new URL(SQUARE_OAUTH_AUTHORIZE_URL);
        url.searchParams.set("client_id", env.SQUARE_APP_ID);
        url.searchParams.set("scope", SQUARE_SCOPES.join(" "));
        url.searchParams.set("session", "false");
        url.searchParams.set("state", state);

        return new Response(null, {
          status: 302,
          headers: {
            location: url.toString(),
            "set-cookie": stateCookie(state),
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
