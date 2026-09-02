/**
 * Server-only helpers for the Square OAuth flow.
 * Never import this from client code.
 */

export const SQUARE_OAUTH_AUTHORIZE_URL =
  "https://connect.squareup.com/oauth2/authorize";
export const SQUARE_OAUTH_TOKEN_URL = "https://connect.squareup.com/oauth2/token";
export const SQUARE_VERSION = "2026-08-19";
export const SQUARE_REDIRECT_URI =
  "https://no-doubts-apparel-launchs.misty-poetry-98f7.workers.dev/api/square/oauth/callback";

export const SQUARE_SCOPES = [
  "ITEMS_READ",
  "INVENTORY_READ",
  "MERCHANT_PROFILE_READ",
  "ORDERS_READ",
  "ORDERS_WRITE",
  "PAYMENTS_WRITE",
] as const;

export const STATE_COOKIE = "sq_oauth_state";
export const STATE_COOKIE_MAX_AGE = 600; // 10 minutes

type D1Result = { success: boolean };
type D1Statement = {
  bind: (...values: unknown[]) => D1Statement;
  run: () => Promise<D1Result>;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
};
export type D1Database = { prepare: (query: string) => D1Statement };

export type SquareEnv = {
  SQUARE_APP_ID: string | undefined;
  SQUARE_APP_SECRET: string | undefined;
  SQUARE_TOKEN_ENCRYPTION_KEY: string | undefined;
  SQUARE_DB: D1Database | undefined;
};

/**
 * Cloudflare injects bindings per request. `cloudflare:workers` exposes them at
 * runtime; in dev / non-Worker contexts we fall back to process.env for the
 * string secrets.
 */
export async function getSquareEnv(): Promise<SquareEnv> {
  let workerEnv: Record<string, unknown> = {};
  try {
    const specifier = "cloudflare:workers";
    const mod = (await import(/* @vite-ignore */ specifier)) as {
      env?: Record<string, unknown>;
    };
    workerEnv = mod.env ?? {};
  } catch {
    workerEnv = {};
  }


  const pick = (name: string): string | undefined => {
    const fromWorker = workerEnv[name];
    if (typeof fromWorker === "string" && fromWorker.length > 0) return fromWorker;
    const fromProcess = process.env[name];
    return fromProcess && fromProcess.length > 0 ? fromProcess : undefined;
  };

  return {
    SQUARE_APP_ID: pick("SQUARE_APP_ID"),
    SQUARE_APP_SECRET: pick("SQUARE_APP_SECRET"),
    SQUARE_TOKEN_ENCRYPTION_KEY: pick("SQUARE_TOKEN_ENCRYPTION_KEY"),
    SQUARE_DB: workerEnv["SQUARE_DB"] as D1Database | undefined,
  };
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

export function stateCookie(value: string): string {
  return `${STATE_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${STATE_COOKIE_MAX_AGE}`;
}

export function clearedStateCookie(): string {
  return `${STATE_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function randomState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return toBase64Url(bytes);
}

function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

/** Constant-time-ish string comparison. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function importEncryptionKey(base64Key: string): Promise<CryptoKey> {
  const raw = fromBase64(base64Key);
  if (raw.byteLength !== 32) {
    throw new Error("Encryption key must decode to 32 bytes.");
  }
  return crypto.subtle.importKey("raw", raw as BufferSource, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function decryptToken(
  key: CryptoKey,
  ciphertext: string,
  iv: string,
): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(iv) as BufferSource },
    key,
    fromBase64(ciphertext) as BufferSource,
  );
  return new TextDecoder().decode(decrypted);
}

export async function encryptToken(
  key: CryptoKey,
  plaintext: string,
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return { ciphertext: toBase64(new Uint8Array(encrypted)), iv: toBase64(iv) };
}

export function htmlResponse(
  title: string,
  message: string,
  status: number,
  extraHeaders: Record<string, string> = {},
): Response {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="robots" content="noindex" /><title>${esc(title)}</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0b0b0b;color:#f5f5f5;font-family:ui-sans-serif,system-ui,sans-serif;padding:24px}main{max-width:34rem;text-align:center}h1{font-size:1.25rem;letter-spacing:.08em;text-transform:uppercase;margin:0 0 .75rem}p{margin:0;color:#a3a3a3;line-height:1.6}</style></head><body><main><h1>${esc(title)}</h1><p>${esc(message)}</p></main></body></html>`;
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", ...extraHeaders },
  });
}

type TokenRow = {
  merchant_id: string;
  access_token_ciphertext: string;
  access_token_iv: string;
  refresh_token_ciphertext: string;
  refresh_token_iv: string;
  expires_at: string | null;
};

const REFRESH_BUFFER_MS = 24 * 60 * 60 * 1000; // refresh 24h before expiry

function isExpiring(expiresAt: string | null): boolean {
  if (!expiresAt) return true;
  const ts = Date.parse(expiresAt);
  if (Number.isNaN(ts)) return true;
  return ts - Date.now() <= REFRESH_BUFFER_MS;
}

export type SquareTokenResult =
  | { ok: true; accessToken: string; merchantId: string }
  | { ok: false; status: number; payload: Record<string, unknown> };

/**
 * Load, decrypt, and (if needed) refresh the stored Square OAuth access token.
 * Keeps all secrets server-side. Returns a structured result so callers can
 * build their own Response.
 */
export async function getValidSquareAccessToken(
  env: SquareEnv,
): Promise<SquareTokenResult> {
  if (!env.SQUARE_DB || !env.SQUARE_TOKEN_ENCRYPTION_KEY) {
    return { ok: false, status: 200, payload: { configured: false, items: [] } };
  }

  const row = await env.SQUARE_DB.prepare(
    `SELECT merchant_id, access_token_ciphertext, access_token_iv,
            refresh_token_ciphertext, refresh_token_iv, expires_at
       FROM square_oauth_tokens
      ORDER BY updated_at DESC
      LIMIT 1`,
  ).first<TokenRow>();

  if (!row) {
    return { ok: false, status: 200, payload: { configured: false, items: [] } };
  }

  const key = await importEncryptionKey(env.SQUARE_TOKEN_ENCRYPTION_KEY);

  let accessToken: string;
  try {
    accessToken = await decryptToken(key, row.access_token_ciphertext, row.access_token_iv);
  } catch {
    return {
      ok: false,
      status: 503,
      payload: { error: "Square credentials could not be read." },
    };
  }

  if (isExpiring(row.expires_at)) {
    if (!env.SQUARE_APP_ID || !env.SQUARE_APP_SECRET) {
      return {
        ok: false,
        status: 503,
        payload: { error: "Square is not configured on the server." },
      };
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
            .bind(access.ciphertext, access.iv, payload.expires_at ?? "", row.merchant_id)
            .run();
        }
        accessToken = payload.access_token;
      }
    } catch {
      // fall through and try the existing token
    }
  }

  return { ok: true, accessToken, merchantId: row.merchant_id };
}
