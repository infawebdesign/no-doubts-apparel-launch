import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/shipping-returns")({
  head: () => ({
    meta: [
      { title: "Shipping, Returns & Order Policy — No Doubts Apparel" },
      {
        name: "description",
        content:
          "Shipping, returns, and order policy for No Doubts Apparel. Canada-only shipping via Canada Post. Questions? Email nodoubts.ca@gmail.com.",
      },
      {
        property: "og:title",
        content: "Shipping, Returns & Order Policy — No Doubts Apparel",
      },
      {
        property: "og:description",
        content:
          "Canada-only shipping, returns, and order information for No Doubts Apparel.",
      },
    ],
  }),
  component: ShippingReturns,
});

function ShippingReturns() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-12 pt-28 sm:px-8 sm:py-20 sm:pt-36">
      <header className="border-b border-border pb-8">
        <h1 className="display max-w-4xl text-[10vw] leading-[0.85] sm:text-[6vw] lg:text-[5rem]">
          Shipping, Returns &amp; Order Policy
        </h1>
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <article className="max-w-3xl space-y-14">
          <section className="space-y-4">
            <h2 className="display text-2xl sm:text-3xl">Order Processing</h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              All items are in stock and printed in advance, so most orders are
              processed and shipped within 1–2 business days of purchase.
              Business days are Monday through Friday, excluding statutory
              holidays. During periods of high order volume, processing may take
              slightly longer; if this occurs, we will notify you by email with
              an updated timeline.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="display text-2xl sm:text-3xl">Shipping Options</h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              We currently sell and ship within Canada only. International
              orders, including orders from the United States, cannot be
              accepted at this time.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              We offer two shipping options via Canada Post:
            </p>
            <ul className="space-y-4">
              <li className="border-l-2 border-bone pl-4">
                <h3 className="display text-lg">Regular Parcel — $15 flat rate</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Economical ground shipping with tracking included. Estimated
                  delivery is 1–3 business days for local Ontario addresses and
                  up to 4–7 business days for other Ontario destinations.
                </p>
              </li>
              <li className="border-l-2 border-bone pl-4">
                <h3 className="display text-lg">Xpresspost — $20 flat rate</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Faster, guaranteed shipping with tracking and signature
                  confirmation included. Estimated delivery is next-day for
                  local addresses and within 2 business days for other Ontario
                  destinations, backed by Canada Post’s on-time guarantee.
                </p>
              </li>
            </ul>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              A tracking number will be emailed to you once your order ships.
              Delivery estimates are based on Canada Post’s standard service
              windows and may occasionally vary due to weather, high shipping
              volumes, or remote delivery areas.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="display text-2xl sm:text-3xl">Sizing</h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Please review the size chart carefully before placing your order.
              If you are between sizes or unsure which size best fits your
              measurements, we recommend sizing up.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="display text-2xl sm:text-3xl">
              Returns, Exchanges &amp; Damages
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Returns, exchanges, and damaged, defective, or misprinted items are
              handled on a case-by-case basis. Please email us directly to let
              us know what’s going on, and we’ll work with you to find a fair
              resolution.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="display text-2xl sm:text-3xl">
              Lost, Missing, or Stolen Packages
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Once a package has been confirmed delivered by Canada Post, we
              are unable to assume responsibility for items that are lost,
              missing, or stolen from the delivery location. If your package
              shows as delivered but you haven’t received it, or if delivery is
              significantly delayed, here’s what to do:
            </p>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <li>
                Look around the delivery location, including with neighbors, as
                packages are sometimes left in a safe spot or accepted by
                someone nearby.
              </li>
              <li>
                Confirm the shipping address on your order confirmation is
                correct.
              </li>
              <li>
                Contact us directly with your order number. You’re welcome to
                open an initial missing-package inquiry with Canada Post
                yourself, but please loop us in — if the package is declared
                missing, only we as the sender can file the formal compensation
                claim, so we’ll need to take it from there to get it resolved.
              </li>
            </ol>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              For added delivery security, we recommend choosing Xpresspost,
              which includes signature confirmation, or having packages shipped
              to a workplace, parcel locker, or other secure location. While we
              understand this situation is frustrating, we are unable to
              replace or refund packages confirmed as delivered but later
              reported stolen.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="display text-2xl sm:text-3xl">Questions or Concerns</h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              For any questions regarding your order, please email us directly
              and we will be happy to assist.
            </p>
            <a
              href="mailto:nodoubts.ca@gmail.com"
              className="inline-block text-sm text-bone transition-colors hover:text-bone/80 sm:text-base"
            >
              nodoubts.ca@gmail.com
            </a>
          </section>
        </article>

        <aside className="space-y-6">
          <div className="border border-border p-6">
            <h2 className="display text-xl text-muted-foreground">Quick links</h2>
            <nav className="mt-4 space-y-2">
              <Link
                to="/shop"
                className="block text-sm text-bone transition-colors hover:text-bone/80"
              >
                Shop
              </Link>
              <Link
                to="/contact"
                className="block text-sm text-bone transition-colors hover:text-bone/80"
              >
                Contact
              </Link>
              <Link
                to="/about"
                className="block text-sm text-bone transition-colors hover:text-bone/80"
              >
                About
              </Link>
            </nav>
          </div>
        </aside>
      </div>
    </div>
  );
}
