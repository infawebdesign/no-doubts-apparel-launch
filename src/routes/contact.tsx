import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm, ValidationError } from "@formspree/react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — No Doubts Apparel" },
      {
        name: "description",
        content:
          "Get in touch with No Doubts Apparel about orders, sizing, collaborations or wholesale.",
      },
      { property: "og:title", content: "Contact — No Doubts Apparel" },
      {
        property: "og:description",
        content: "Get in touch with No Doubts Apparel.",
      },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [state, handleSubmit, reset] = useForm("xrpbqpgr");

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-12 pt-28 sm:px-8 sm:py-20 sm:pt-36">
      <h1 className="display text-[14vw] leading-[0.85] sm:text-[9vw] lg:text-[8rem]">Contact</h1>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {state.succeeded ? (
          <div className="space-y-4 border border-border p-6 sm:p-8" role="status">
            <h2 className="display text-2xl">Message sent</h2>
            <p className="text-sm text-muted-foreground">
              Thanks for reaching out to No Doubts Apparel. We’ll reply to the email address you
              provided.
            </p>
            <button type="button" onClick={reset} className="text-sm underline underline-offset-4">
              Send another message
            </button>
          </div>
        ) : (
          <form
            action="https://formspree.io/f/xrpbqpgr"
            method="POST"
            className="space-y-6 border border-border p-6 sm:p-8"
            aria-busy={state.submitting}
            onSubmit={handleSubmit}
          >
            <input
              type="text"
              name="_gotcha"
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              aria-hidden="true"
            />
            <div className="grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="label text-muted-foreground">Name</span>
                <input
                  required
                  name="name"
                  autoComplete="name"
                  maxLength={100}
                  disabled={state.submitting}
                  className="mt-2 w-full border border-input bg-transparent px-4 py-3 text-sm focus:border-bone focus:outline-none"
                />
                <ValidationError
                  field="name"
                  prefix="Name"
                  errors={state.errors}
                  className="mt-2 text-sm text-red-400"
                />
              </label>
              <label className="block">
                <span className="label text-muted-foreground">Email</span>
                <input
                  required
                  type="email"
                  name="email"
                  autoComplete="email"
                  maxLength={254}
                  disabled={state.submitting}
                  className="mt-2 w-full border border-input bg-transparent px-4 py-3 text-sm focus:border-bone focus:outline-none"
                />
                <ValidationError
                  field="email"
                  prefix="Email"
                  errors={state.errors}
                  className="mt-2 text-sm text-red-400"
                />
              </label>
            </div>
            <label className="block">
              <span className="label text-muted-foreground">Subject</span>
              <select
                name="subject"
                disabled={state.submitting}
                className="mt-2 w-full border border-input bg-background px-4 py-3 text-sm focus:border-bone focus:outline-none"
              >
                <option>Order enquiry</option>
                <option>Sizing</option>
                <option>Collaboration</option>
                <option>Wholesale</option>
                <option>Other</option>
              </select>
              <ValidationError
                field="subject"
                prefix="Subject"
                errors={state.errors}
                className="mt-2 text-sm text-red-400"
              />
            </label>
            <label className="block">
              <span className="label text-muted-foreground">Message</span>
              <textarea
                required
                name="message"
                maxLength={10000}
                disabled={state.submitting}
                rows={6}
                className="mt-2 w-full border border-input bg-transparent px-4 py-3 text-sm focus:border-bone focus:outline-none"
              />
              <ValidationError
                field="message"
                prefix="Message"
                errors={state.errors}
                className="mt-2 text-sm text-red-400"
              />
            </label>
            <button
              type="submit"
              disabled={state.submitting}
              className="display w-full bg-bone px-8 py-4 text-lg text-ink transition-colors hover:bg-bone/85 disabled:cursor-wait disabled:opacity-60"
            >
              {state.submitting ? "Sending…" : "Send message"}
            </button>
            <div role="alert" className="space-y-2 text-sm text-red-400">
              <ValidationError errors={state.errors} />
              {state.errors && (
                <p>Your message wasn’t sent. Please try again, or email nodoubts.ca@gmail.com.</p>
              )}
            </div>
          </form>
        )}

        <aside className="space-y-8">
          <div className="border border-border p-6">
            <h2 className="display text-xl text-muted-foreground">Email</h2>
            <a
              href="mailto:nodoubts.ca@gmail.com"
              className="mt-3 inline-block text-sm text-bone transition-colors hover:text-bone/80"
            >
              nodoubts.ca@gmail.com
            </a>
            <a
              href="https://www.instagram.com/nodoubts.apparel?utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center gap-2 text-sm text-bone transition-colors hover:text-bone/80"
              aria-label="No Doubts Apparel on Instagram"
            >
              <svg
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
              @nodoubts.apparel
            </a>
          </div>
          <div className="border border-border p-6">
            <h2 className="display text-xl text-muted-foreground">Orders</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Orders are processed within 1–2 business days and shipped via Canada Post. Tracking is
              emailed once your order ships.
            </p>
            <Link
              to="/shipping-returns"
              className="mt-3 inline-block text-sm text-bone transition-colors hover:text-bone/80"
            >
              Shipping &amp; Returns
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
