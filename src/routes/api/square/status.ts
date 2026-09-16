import { createFileRoute } from "@tanstack/react-router";
import { statusHandler } from "@/lib/payment-handlers.server";
export const Route = createFileRoute("/api/square/status")({
  server: { handlers: { GET: ({ request }) => statusHandler(request) } },
});
