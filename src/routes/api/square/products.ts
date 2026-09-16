import { createFileRoute } from "@tanstack/react-router";
import { productsHandler } from "@/lib/payment-handlers.server";
export const Route = createFileRoute("/api/square/products")({
  server: { handlers: { GET: ({ request }) => productsHandler(request) } },
});
