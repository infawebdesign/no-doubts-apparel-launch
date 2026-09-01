import { createFileRoute } from "@tanstack/react-router";

import {
  SQUARE_OAUTH_TOKEN_URL,
  SQUARE_REDIRECT_URI,
  SQUARE_SCOPES,
  SQUARE_VERSION,
  STATE_COOKIE,
  clearedStateCookie,
  encryptToken,
  getSquareEnv,
  htmlResponse,
  importEncryptionKey,
  readCookie,
  safeEqual,
} from "@/lib/square-oauth.server";

type SquareTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  merchant_id?: string;
  token_type?: string;
};

export const Route = createFileRoute("/api/square/oauth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const clearState = { "set-cookie": clearedStateCookie(), "cache-control": "no-store" };
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");
        const errorDescription = url.searchParams.get("error_description");

        if (error) {
          return htmlResponse(
            "Square authorization failed",
            errorDescription
              ? `Square reported: ${errorDescription}`
              : `Square reported an error (${error}).`,
            400,
            clearState,
          );
        }

        const cookieState = readCookie(request, STATE_COOKIE);
        if (!state || !cookieState || !safeEqual(state, cookieState)) {
          return htmlResponse(
            "OAuth state validation error",
            "The authorization request could not be verified. Please start the connection again.",
            400,
            clearState,
          );
        }

        if (!code) {
          return htmlResponse(
            "Square authorization failed",
            "No authorization code was returned by Square.",
            400,
            clearState,
          );
        }

        const env = await getSquareEnv();
        if (!env.SQUARE_APP_ID || !env.SQUARE_APP_SECRET) {
          return htmlResponse(
            "Square not configured",
            "Square application credentials are missing on the server.",
            500,
            clearState,
          );
        }
        if (!env.SQUARE_TOKEN_ENCRYPTION_KEY) {
          return htmlResponse(
            "Square not configured",
            "The token encryption key is missing on the server.",
            500,
            clearState,
          );
        }
        if (!env.SQUARE_DB) {
          return htmlResponse(
            "Square not configured",
            "The token database binding is not available on the server.",
            500,
            clearState,
          );
        }

        let tokenResponse: Response;
        try {
          tokenResponse = await fetch(SQUARE_OAUTH_TOKEN_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Square-Version": SQUARE_VERSION,
            },
            body: JSON.stringify({
              client_id: env.SQUARE_APP_ID,
              client_secret: env.SQUARE_APP_SECRET,
              code,
              grant_type: "authorization_code",
              redirect_uri: SQUARE_REDIRECT_URI,
            }),
          });
        } catch {
          return htmlResponse(
            "Square authorization failed",
            "Could not reach Square to complete the authorization. Please try again.",
            502,
            clearState,
          );
        }

        const payload = (await tokenResponse
          .json()
          .catch(() => null)) as SquareTokenResponse | null;

        if (!tokenResponse.ok || !payload?.access_token || !payload.refresh_token) {
          return htmlResponse(
            "Square authorization failed",
            "Square did not return a valid authorization. Please try connecting again.",
            502,
            clearState,
          );
        }

        const merchantId = payload.merchant_id;
        if (!merchantId) {
          return htmlResponse(
            "Square authorization failed",
            "Square did not return a merchant identifier.",
            502,
            clearState,
          );
        }

        try {
          const key = await importEncryptionKey(env.SQUARE_TOKEN_ENCRYPTION_KEY);
          const access = await encryptToken(key, payload.access_token);
          const refresh = await encryptToken(key, payload.refresh_token);

          await env.SQUARE_DB.prepare(
            `INSERT INTO square_oauth_tokens (
               merchant_id,
               access_token_ciphertext,
               access_token_iv,
               refresh_token_ciphertext,
               refresh_token_iv,
               expires_at,
               scopes,
               updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
             ON CONFLICT(merchant_id) DO UPDATE SET
               access_token_ciphertext = excluded.access_token_ciphertext,
               access_token_iv = excluded.access_token_iv,
               refresh_token_ciphertext = excluded.refresh_token_ciphertext,
               refresh_token_iv = excluded.refresh_token_iv,
               expires_at = excluded.expires_at,
               scopes = excluded.scopes,
               updated_at = datetime('now')`,
          )
            .bind(
              merchantId,
              access.ciphertext,
              access.iv,
              refresh.ciphertext,
              refresh.iv,
              payload.expires_at ?? "",
              JSON.stringify(SQUARE_SCOPES),
            )
            .run();
        } catch {
          return htmlResponse(
            "Square authorization failed",
            "The authorization could not be saved securely. Please try again.",
            500,
            clearState,
          );
        }

        return htmlResponse(
          "Square connected successfully",
          `You can close this window. Merchant ID: ${merchantId}`,
          200,
          clearState,
        );
      },
    },
  },
});
