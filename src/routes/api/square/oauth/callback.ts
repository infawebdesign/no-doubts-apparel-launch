import { createFileRoute } from "@tanstack/react-router";
import { disabledSquareConnection } from "@/lib/square-connection.server";
export const Route = createFileRoute("/api/square/oauth/callback")({
  server: { handlers: { GET: disabledSquareConnection } },
});
