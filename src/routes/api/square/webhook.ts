import { createFileRoute } from "@tanstack/react-router";
import { squareWebhookHandler } from "@/lib/square-webhook.server";

export const Route = createFileRoute("/api/square/webhook")({
  server: { handlers: { POST: ({ request }) => squareWebhookHandler(request) } },
});
