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
};
export type D1Database = { prepare: (query: string) => D1Statement };

export type SquareEnv = {
  SQUARE_APP_ID?: string;
  SQUARE_APP_SECRET?: string;
  SQUARE_TOKEN_ENCRYPTION_KEY?: string;
  SQUARE_DB?: D1Database;
};

/**
 * Cloudflare injects bindings per request. `cloudflare:workers` exposes them at
 * runtime; in dev / non-Worker contexts we fall back to process.env for the
 * string secrets.
 */
export async function getSquareEnv(): Promise<SquareEnv> {
  let workerEnv: Record<string, unknown> = {};
  try {
    const mod = (await import(
      /* @vite-ignore */ "cloudflare:workers"
    )) as { env?: Record<string, unknown> };
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
  ]);
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
