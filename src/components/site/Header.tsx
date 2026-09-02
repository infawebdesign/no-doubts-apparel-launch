import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, ShoppingBag, Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";

const nav = [
  { to: "/shop", label: "Shop" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { count, lines, addLine, removeLine } = useCart();

  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <div className="mx-auto flex max-w-[1700px] items-center justify-between gap-4 px-4 py-5 md:grid md:grid-cols-[auto_minmax(0,1fr)_auto] md:justify-normal sm:px-8">
        <Link to="/" className="display shrink-0 text-2xl tracking-tight sm:text-3xl">
          No&#8209;Doubts
        </Link>

        <nav className="hidden justify-center gap-10 md:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="label text-bone/70 transition-colors hover:text-bone"
              activeProps={{ className: "label text-bone" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center justify-end gap-5">
          <button
            type="button"
            aria-label={`Bag (${count})`}
            onClick={() => setCartOpen(true)}
            className="relative text-bone/80 transition-colors hover:text-bone"
          >
            <ShoppingBag className="size-5" />
            <span className="label absolute -top-1 -right-2 text-[9px] tracking-normal">{count}</span>
          </button>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="md:hidden"
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="flex flex-col border-t border-border bg-ink/95 backdrop-blur md:hidden">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="display border-b border-border px-4 py-4 text-2xl"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </header>
  );
}

function CartDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { lines, count, removeLine, addLine } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = lines.reduce(
    (sum, line) => sum + (line.priceAmount ?? 0) * line.quantity,
    0,
  );

  const canCheckout =
    !submitting &&
    lines.length > 0 &&
    lines.every((line) => line.squareVariationId && line.quantity > 0);

  const handleCheckout = async () => {
    if (!canCheckout) return;
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        items: lines.map((line) => ({
          variationId: line.squareVariationId,
          quantity: line.quantity,
        })),
      };

      const res = await fetch("/api/square/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => ({}))) as {
        checkoutUrl?: string;
        error?: string;
      };

      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.error || "Checkout failed");
      }

      window.location.href = data.checkoutUrl;
    } catch {
      setError("We couldn't start checkout. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col border-border bg-ink sm:max-w-md">
        <SheetHeader className="border-b border-border pb-4 text-left">
          <SheetTitle className="display text-2xl text-bone">Your bag</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">Your bag is empty.</p>
          ) : (
            <ul className="space-y-4">
              {lines.map((line) => (
                <li key={line.squareVariationId} className="flex gap-3">
                  <div className="aspect-[4/5] w-20 shrink-0 overflow-hidden border border-border bg-muted">
                    {line.imageUrl ? (
                      <img
                        src={line.imageUrl}
                        alt={line.imageAlt}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="grid size-full place-items-center text-[10px] text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="display truncate text-base text-bone">{line.name}</p>
                    <p className="label mt-0.5 text-xs text-muted-foreground uppercase">
                      Size {line.size}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        disabled={line.quantity <= 1}
                        onClick={() =>
                          addLine({
                            squareItemId: line.squareItemId,
                            squareVariationId: line.squareVariationId,
                            name: line.name,
                            slug: line.slug,
                            size: line.size,
                            priceAmount: line.priceAmount,
                            currency: line.currency,
                            imageUrl: line.imageUrl,
                            imageAlt: line.imageAlt,
                            quantity: -1,
                          })
                        }
                        className="grid size-7 place-items-center border border-border text-bone transition-colors hover:border-bone disabled:opacity-40"
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="w-6 text-center text-sm tabular-nums text-bone">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() =>
                          addLine({
                            squareItemId: line.squareItemId,
                            squareVariationId: line.squareVariationId,
                            name: line.name,
                            slug: line.slug,
                            size: line.size,
                            priceAmount: line.priceAmount,
                            currency: line.currency,
                            imageUrl: line.imageUrl,
                            imageAlt: line.imageAlt,
                            quantity: 1,
                          })
                        }
                        className="grid size-7 place-items-center border border-border text-bone transition-colors hover:border-bone"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end justify-between">
                    <button
                      type="button"
                      aria-label={`Remove ${line.name}`}
                      onClick={() => removeLine(line.squareVariationId)}
                      className="text-muted-foreground transition-colors hover:text-bone"
                    >
                      <Trash2 className="size-4" />
                    </button>
                    <span className="text-sm font-semibold text-bone">
                      {formatPrice((line.priceAmount ?? 0) * line.quantity)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <SheetFooter className="flex-col border-t border-border pt-4 sm:flex-col sm:space-x-0">
          <div className="flex items-center justify-between py-2">
            <span className="label text-muted-foreground">Subtotal</span>
            <span className="display text-xl text-bone">{formatPrice(subtotal)}</span>
          </div>
          {error && (
            <p className="mb-3 text-sm text-red-400">{error}</p>
          )}
          <button
            type="button"
            disabled={!canCheckout}
            onClick={handleCheckout}
            className={`display w-full bg-bone px-8 py-4 text-lg text-ink transition-opacity ${
              canCheckout ? "hover:opacity-90" : "cursor-not-allowed opacity-50"
            }`}
          >
            {submitting ? "Redirecting..." : `Checkout ${count > 0 ? `(${count})` : ""}`}
          </button>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Taxes and shipping calculated at checkout.
          </p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
