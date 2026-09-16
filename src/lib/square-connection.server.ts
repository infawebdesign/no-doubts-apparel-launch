import { paymentJson } from "./square-config.server.ts";

/** Merchant onboarding is an operator task, never a public storefront feature. */
export function disabledSquareConnection() {
  return paymentJson(
    { error: "Square account connections are not available on this website." },
    410,
    { "set-cookie": "sq_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0" },
  );
}
