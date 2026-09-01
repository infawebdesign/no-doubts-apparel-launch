import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

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
  const [sent, setSent] = useState(false);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-12 pt-28 sm:px-8 sm:py-20 sm:pt-36">
      <h1 className="display text-[14vw] leading-[0.85] sm:text-[9vw] lg:text-[8rem]">
        Contact
      </h1>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <form
          className="space-y-6 border border-border p-6 sm:p-8"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="label text-muted-foreground">Name</span>
              <input
                required
                className="mt-2 w-full border border-input bg-transparent px-4 py-3 text-sm focus:border-bone focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="label text-muted-foreground">Email</span>
              <input
                required
                type="email"
                className="mt-2 w-full border border-input bg-transparent px-4 py-3 text-sm focus:border-bone focus:outline-none"
              />
            </label>
          </div>
          <label className="block">
            <span className="label text-muted-foreground">Subject</span>
            <select className="mt-2 w-full border border-input bg-background px-4 py-3 text-sm focus:border-bone focus:outline-none">
              <option>Order enquiry</option>
              <option>Sizing</option>
              <option>Collaboration</option>
              <option>Wholesale</option>
              <option>Other</option>
            </select>
          </label>
          <label className="block">
            <span className="label text-muted-foreground">Message</span>
            <textarea
              required
              rows={6}
              className="mt-2 w-full border border-input bg-transparent px-4 py-3 text-sm focus:border-bone focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="display w-full bg-bone px-8 py-4 text-lg text-ink transition-colors hover:bg-bone/85"
          >
            Send message
          </button>
          <p className="text-xs text-muted-foreground">
            {sent && "Thanks — we'll be in touch once the brand inbox is live."}
          </p>
        </form>

        <aside className="space-y-8">
          <div className="border border-border p-6">
            <h2 className="display text-xl text-muted-foreground">Email</h2>
            <a
              href="mailto:nodoubtsapparel.ca@gmail.com"
              className="mt-3 inline-block text-sm text-bone transition-colors hover:text-bone/80"
            >
              nodoubtsapparel.ca@gmail.com
            </a>
            <a
              href="https://www.instagram.com/nodoubts.apparel?utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm text-bone transition-colors hover:text-bone/80"
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
              Orders and payments will be processed through Square once checkout
              is connected.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
