import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — No Doubts Apparel" },
      {
        name: "description",
        content:
          "How No Doubts Apparel collects, uses, protects, and retains customer information.",
      },
      { property: "og:title", content: "Privacy Policy — No Doubts Apparel" },
      {
        property: "og:description",
        content: "How No Doubts Apparel handles customer information.",
      },
    ],
  }),
  component: Privacy,
});

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-4">
    <h2 className="display text-2xl sm:text-3xl">{title}</h2>
    <div className="space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
      {children}
    </div>
  </section>
);

function Privacy() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-12 pt-28 sm:px-8 sm:py-20 sm:pt-36">
      <header className="border-b border-border pb-8">
        <p className="label mb-4 text-muted-foreground">Effective September 24, 2026</p>
        <h1 className="display max-w-4xl text-[10vw] leading-[0.85] sm:text-[6vw] lg:text-[5rem]">
          Privacy Policy
        </h1>
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <article className="max-w-3xl space-y-14">
          <Section title="Our Commitment">
            <p>
              No Doubts Apparel is a Canadian-owned business. We collect only the information we
              need to operate our store, complete orders, respond to customers, prevent fraud, and
              meet our legal obligations. We do not sell or rent personal information.
            </p>
          </Section>

          <Section title="Information We Collect">
            <p>
              When you prepare an order, we receive your name, Canadian delivery address, selected
              shipping method, cart contents, and order identifiers. Payment card and digital-wallet
              details are entered directly on Square&apos;s secure checkout page; we do not receive
              or store full card numbers or security codes.
            </p>
            <p>
              If you contact us, we receive the name, email address, and message you choose to send.
              Our site also receives limited technical information needed for security and reliable
              operation, such as request timing and network information used for rate limiting.
            </p>
          </Section>

          <Section title="How We Use Information">
            <ul className="list-disc space-y-2 pl-5">
              <li>To calculate shipping and GST/HST, create checkout, and fulfill orders.</li>
              <li>To provide order updates and customer support.</li>
              <li>To protect the store and customers from fraud, misuse, and duplicate charges.</li>
              <li>To maintain business, tax, and transaction records required by law.</li>
            </ul>
          </Section>

          <Section title="Service Providers">
            <p>
              We use Square for checkout and payment processing, Cloudflare to host and secure this
              website, Formspree to deliver contact-form messages, and Canada Post to ship orders.
              Each provider handles information for its service under its own privacy terms. We may
              also disclose information when required by law or to protect legal rights and safety.
            </p>
          </Section>

          <Section title="Storage and Retention">
            <p>
              Your browser stores your bag and a random checkout-attempt identifier on your device.
              We do not currently use behavioural advertising or third-party analytics cookies.
            </p>
            <p>
              On our systems, unfinished checkout address details are removed after 24 hours.
              Completed checkout snapshots are minimized by removing names and street addresses, and
              the local checkout cache is removed after 90 days. Square, Formspree, email, and
              shipping providers may retain records according to their own policies and legal
              obligations. Business and transaction records may be retained where required by law.
            </p>
          </Section>

          <Section title="Safeguards">
            <p>
              We use encrypted connections, secure hosted payment pages, restricted server access,
              encrypted payment credentials, integrity checks, and limited retention. No method of
              online transmission or storage is completely risk-free, but we regularly review the
              safeguards appropriate to the information we handle.
            </p>
          </Section>

          <Section title="Your Choices and Rights">
            <p>
              You may ask what personal information we hold about you, request a correction, or ask
              us to delete information that we are not legally required to retain. To protect you,
              we may need to verify your identity before completing a request.
            </p>
          </Section>

          <Section title="Contact and Updates">
            <p>
              Questions, privacy requests, or concerns can be sent to{" "}
              <a className="text-bone hover:text-bone/80" href="mailto:nodoubts.ca@gmail.com">
                nodoubts.ca@gmail.com
              </a>
              . We may update this policy as our services or legal requirements change. The current
              version and effective date will always appear on this page.
            </p>
          </Section>
        </article>

        <aside className="space-y-6">
          <div className="border border-border p-6">
            <h2 className="display text-xl text-muted-foreground">Related information</h2>
            <nav className="mt-4 space-y-2">
              <Link to="/shipping-returns" className="block text-sm text-bone hover:text-bone/80">
                Shipping, Returns &amp; Tax
              </Link>
              <Link to="/contact" className="block text-sm text-bone hover:text-bone/80">
                Contact
              </Link>
            </nav>
          </div>
        </aside>
      </div>
    </div>
  );
}
