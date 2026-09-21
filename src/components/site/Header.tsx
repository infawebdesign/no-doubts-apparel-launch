import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { prepareCheckout } from "@/lib/checkout-attempt";
import { parseShipping, PROVINCES, SHIPPING_METHODS } from "@/lib/shipping";
import { ShippingFields, emptyShipping, type ShippingDraft } from "./ShippingFields";
import { MAX_QTY_PER_LINE, squareCheckoutUrl } from "@/lib/payment-contract";
import { Menu, X, ShoppingBag, Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";

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
          <img
            src="/campaign/no-doubts-logo.png"
            alt="No Doubts — home"
            width={1441}
            height={260}
            className="h-auto w-36 sm:w-44"
          />
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
            <span className="label absolute -top-1 -right-2 text-[9px] tracking-normal">
              {count}
            </span>
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

function CartDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { lines, count, removeLine, addLine, refreshPrices } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const checkoutBusy = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [shipping, setShipping] = useState<ShippingDraft>(emptyShipping);
  const [reviewed, setReviewed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [catalogReady, setCatalogReady] = useState(false);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setRefreshing(true);
    setCatalogReady(false);
    refreshPrices()
      .then(() => {
        if (active) setCatalogReady(true);
      })
      .catch(() => {
        if (active) setError("We couldn’t refresh prices. Close and reopen your bag to retry.");
      })
      .finally(() => {
        if (active) setRefreshing(false);
      });
    return () => {
      active = false;
    };
  }, [open, refreshPrices]);

  const subtotal = lines.reduce((sum, line) => sum + (line.priceAmount ?? 0) * line.quantity, 0);

  const canCheckout =
    !submitting &&
    !refreshing &&
    catalogReady &&
    lines.length > 0 &&
    lines.every((line) => line.squareVariationId && line.quantity > 0 && line.priceAmount !== null);

  const handleCheckout = async () => {
    if (!canCheckout || checkoutBusy.current) return;
    const destination = parseShipping(shipping);
    if (!destination) {
      setError(
        "Please complete your Canadian shipping address. Check that the postal code matches the province.",
      );
      return;
    }
    checkoutBusy.current = true;
    if (!reviewed) {
      checkoutBusy.current = false;
      setError("Please review and confirm your delivery address below.");
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      if (await refreshPrices()) {
        setError(
          "Prices or availability changed. Please review your updated bag before continuing.",
        );
        setSubmitting(false);
        checkoutBusy.current = false;
        return;
      }
      const items = lines.map((line) => ({
        variationId: line.squareVariationId,
        quantity: line.quantity,
      }));
      const expectedPrices = lines.map((line) => ({
        variationId: line.squareVariationId,
        amount: line.priceAmount,
      }));
      const attempt = await prepareCheckout(items, destination, JSON.stringify(expectedPrices));
      const payload = {
        items,
        expectedPrices,
        shipping: destination,
        attemptId: attempt.attemptId,
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

      if (!res.ok || !squareCheckoutUrl(data.checkoutUrl)) {
        throw new Error(data.error || "Checkout failed");
      }

      window.location.href = data.checkoutUrl;
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "We couldn't start checkout. Please try again.",
      );
      setSubmitting(false);
      checkoutBusy.current = false;
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
                        disabled={line.quantity <= 1 || submitting}
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
                        disabled={line.quantity >= MAX_QTY_PER_LINE || submitting}
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
                      disabled={submitting}
                      onClick={() => removeLine(line.squareVariationId)}
                      className="text-muted-foreground transition-colors hover:text-bone"
                    >
                      <Trash2 className="size-4" />
                    </button>
                    <span className="text-sm font-semibold text-bone">
                      {line.priceAmount === null
                        ? "Unavailable"
                        : formatPrice(line.priceAmount * line.quantity)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {lines.length > 0 && (
            <>
              <ShippingFields
                value={shipping}
                onChange={(value) => {
                  setShipping(value);
                  setReviewed(false);
                }}
                disabled={submitting}
              />
              {parseShipping(shipping) && (
                <div className="mt-4 space-y-2 border border-border p-3 text-sm">
                  <p className="font-semibold">Review your delivery address</p>
                  <p>
                    {shipping.name}
                    <br />
                    {shipping.address}
                    {shipping.apartment && `, ${shipping.apartment}`}
                    <br />
                    {shipping.city}, {shipping.province} {shipping.postalCode}
                    <br />
                    Canada
                  </p>
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={reviewed}
                      disabled={submitting}
                      onChange={(event) => setReviewed(event.target.checked)}
                    />
                    <span>I checked this address and confirm it is correct.</span>
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Square and digital wallets include shipping in the order subtotal. The final
                    total includes shipping and GST/HST.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <SheetFooter className="flex-col border-t border-border pt-4 sm:flex-col sm:space-x-0">
          <div className="flex items-center justify-between py-2">
            <span className="label text-muted-foreground">Subtotal</span>
            <span className="display text-xl text-bone">{formatPrice(subtotal)}</span>
          </div>
          {lines.length > 0 && (
            <div className="space-y-1 pb-3 text-sm text-bone">
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{formatPrice(SHIPPING_METHODS[shipping.method].amount)}</span>
              </div>
              {shipping.province && (
                <>
                  <div className="flex justify-between">
                    <span>
                      {PROVINCES[shipping.province][1] === 5 ? "GST" : "HST"} (
                      {PROVINCES[shipping.province][1]}%, including shipping)
                    </span>
                    <span>
                      {formatPrice(
                        Math.round(
                          ((subtotal + SHIPPING_METHODS[shipping.method].amount) *
                            PROVINCES[shipping.province][1]) /
                            100,
                        ),
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Estimated total</span>
                    <span>
                      {formatPrice(
                        subtotal +
                          SHIPPING_METHODS[shipping.method].amount +
                          Math.round(
                            ((subtotal + SHIPPING_METHODS[shipping.method].amount) *
                              PROVINCES[shipping.province][1]) /
                              100,
                          ),
                      )}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
          {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
          <button
            type="button"
            disabled={!canCheckout}
            onClick={handleCheckout}
            className={`display w-full bg-bone px-8 py-4 text-lg text-ink transition-opacity ${
              canCheckout ? "hover:opacity-90" : "cursor-not-allowed opacity-50"
            }`}
          >
            {refreshing
              ? "Checking prices…"
              : submitting
                ? "Redirecting..."
                : `Checkout ${count > 0 ? `(${count})` : ""}`}
          </button>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Canada-only shipping. Regular Parcel $15 / Xpresspost $20. Orders typically process
            within 1–2 business days. Taxes calculated at checkout.
          </p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
