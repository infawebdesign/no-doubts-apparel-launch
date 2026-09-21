export function securityHeaders(response: Response, nonce: string): Response {
  const result = new Response(response.body, response);
  const headers = result.headers;
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("Strict-Transport-Security", "max-age=31536000");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}'`,
      "script-src-attr 'none'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://formspree.io",
      "form-action 'self' https://formspree.io",
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  );
  if (headers.get("content-type")?.includes("text/html")) headers.set("Cache-Control", "no-store");
  return result;
}
