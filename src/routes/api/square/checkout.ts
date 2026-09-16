import { createFileRoute } from "@tanstack/react-router";
import { checkoutHandler } from "@/lib/payment-handlers.server";
export const Route = createFileRoute("/api/square/checkout")({
  server: { handlers: { POST: ({ request }) => checkoutHandler(request) } },
});
