import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/order-confirmed")({
  head: () => ({
    meta: [
      { title: "Order confirmed — No Doubts Apparel" },
      {
        name: "description",
        content:
          "Thank you for your order with No Doubts Apparel. You will receive a confirmation email shortly.",
      },
      { property: "og:title", content: "Order confirmed — No Doubts Apparel" },
      {
        property: "og:description",
        content:
          "Thank you for your order with No Doubts Apparel.",
      },
    ],
  }),
  component: OrderConfirmed,
});

function OrderConfirmed() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 pt-20">
      <div className="max-w-md text-center">
        <h1 className="display text-4xl text-bone sm:text-5xl">Order confirmed</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Thank you for your order. You will receive an order confirmation email
          shortly.
        </p>
        <div className="mt-8">
          <Link
            to="/shop"
            className="inline-flex items-center justify-center bg-bone px-6 py-3 text-sm font-semibold text-ink transition-opacity hover:opacity-90"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
