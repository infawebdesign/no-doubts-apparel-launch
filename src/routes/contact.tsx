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
    <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-8 sm:py-20">
      <p className="label text-muted-foreground">Get in touch</p>
      <h1 className="display mt-4 text-[14vw] leading-[0.85] sm:text-[9vw] lg:text-[8rem]">
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
            {sent
              ? "[Placeholder — form delivery is not connected yet.]"
              : "[Placeholder — message delivery to be connected once the brand inbox is confirmed.]"}
          </p>
        </form>

        <aside className="space-y-8">
          <div className="border border-border p-6">
            <h2 className="display text-xl text-muted-foreground">Email</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              [Contact email to be provided]
            </p>
          </div>
          <div className="border border-border p-6">
            <h2 className="display text-xl text-muted-foreground">Social</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              [Social handles to be provided]
            </p>
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
