import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import { forgetCheckout } from "@/lib/checkout-attempt";
import { validAttempt, type PaymentLine } from "@/lib/payment-contract";

export const Route = createFileRoute("/order-confirmed")({
  head: () => ({
    meta: [
      { title: "Payment status — No Doubts Apparel" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: OrderConfirmed,
});

type Status = "checking" | "paid" | "pending" | "canceled" | "refunded" | "unknown" | "unavailable";
const messages: Record<Status, [string, string]> = {
  checking: ["Checking your payment", "Please wait while we check your payment with Square."],
  paid: ["Payment confirmed", "Square has confirmed your payment. Thank you for your order."],
  pending: [
    "Payment not yet confirmed",
    "We have not confirmed a completed payment. If you already paid, check your Square receipt or contact us before paying again.",
  ],
  canceled: [
    "Checkout canceled",
    "This checkout was canceled. Your bag has been kept so you can try again.",
  ],
  refunded: [
    "Refund recorded",
    "Square shows a refund on this payment. Contact us if you have a question about your order.",
  ],
  unknown: [
    "No checkout to verify",
    "We could not find a checkout associated with this page. If you already paid, check your Square receipt or contact us.",
  ],
  unavailable: [
    "Unable to confirm right now",
    "We could not check your payment. Please check your Square receipt or contact us before paying again.",
  ],
};

function OrderConfirmed() {
  const [status, setStatus] = useState<Status>("checking");
  const [retry, setRetry] = useState(0);
  const { clearIfMatches } = useCart();
  useEffect(() => {
    const attempt = new URL(window.location.href).searchParams.get("attempt");
    if (!validAttempt(attempt)) {
      setStatus("unknown");
      return;
    }
    const controller = new AbortController();
    setStatus("checking");
    void (async () => {
      try {
        const response = await fetch(`/api/square/status?attempt=${encodeURIComponent(attempt)}`, {
          signal: controller.signal,
        });
        if (response.status === 404) {
          setStatus("unknown");
          return;
        }
        if (!response.ok) throw new Error("Unavailable");
        const data = (await response.json()) as { status?: string; cart?: PaymentLine[] };
        if (controller.signal.aborted) return;
        if (data.status === "paid" && Array.isArray(data.cart)) {
          clearIfMatches(data.cart);
          forgetCheckout(attempt);
          setStatus("paid");
        } else if (data.status === "canceled") {
          forgetCheckout(attempt);
          setStatus("canceled");
        } else if (data.status === "pending" || data.status === "refunded") {
          setStatus(data.status);
        } else {
          setStatus("unknown");
        }
      } catch {
        if (!controller.signal.aborted) setStatus("unavailable");
      }
    })();
    return () => controller.abort();
  }, [retry, clearIfMatches]);
  const [title, message] = messages[status];
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 pt-20">
      <div className="max-w-md text-center" aria-live="polite">
        <h1 className="display text-4xl text-bone sm:text-5xl">{title}</h1>
        <p className="mt-4 text-sm text-muted-foreground">{message}</p>
        {(status === "pending" || status === "unavailable") && (
          <button
            type="button"
            onClick={() => setRetry((n) => n + 1)}
            className="mt-6 border border-bone px-6 py-3 text-sm text-bone"
          >
            Check again
          </button>
        )}
        <div className="mt-8 flex justify-center gap-5">
          <Link to="/shop" className="bg-bone px-6 py-3 text-sm font-semibold text-ink">
            Continue shopping
          </Link>
          <Link to="/contact" className="border border-bone px-6 py-3 text-sm text-bone">
            Contact us
          </Link>
        </div>
      </div>
    </div>
  );
}
