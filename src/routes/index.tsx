import { createFileRoute, Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero-campaign.jpg";
import editorialImg from "@/assets/editorial-lift.jpg";
import { products } from "@/lib/products";
import { ProductCard } from "@/components/site/ProductCard";
import { Ticker } from "@/components/site/Ticker";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "No Doubts Apparel — Gym-bred streetwear" },
      {
        name: "description",
        content:
          "Graphic-led streetwear built on gym culture. Shop the first No Doubts Apparel drop: tiger, snake and script tees.",
      },
      { property: "og:title", content: "No Doubts Apparel" },
      {
        property: "og:description",
        content: "Graphic-led streetwear built on gym culture. Shop the drop.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <>
      <section className="relative">
        <div className="relative min-h-[78svh] overflow-hidden">
          <img
            src={heroImg}
            alt="No Doubts Apparel campaign"
            width={1920}
            height={1088}
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/10" />
          <div className="relative mx-auto flex min-h-[78svh] max-w-[1600px] flex-col justify-end px-4 pb-12 sm:px-8">
            <p className="label text-muted-foreground">Drop 001 — MMXXVI</p>
            <h1 className="display mt-4 text-[16vw] leading-[0.85] sm:text-[11vw] lg:text-[9rem]">
              <span className="text-bone">Leave</span>{" "}
              <span className="text-muted-foreground">No</span>{" "}
              <span className="text-muted-foreground">Doubts</span>
            </h1>
            <div className="mt-8 grid gap-6 sm:flex sm:items-end sm:justify-between">
              <p className="max-w-md text-sm text-bone/80">
                Heavy graphics, gym-bred. Three tees live now, a fourth on the
                way.
              </p>
              <Link
                to="/shop"
                className="display inline-flex w-fit items-center bg-bone px-8 py-4 text-lg text-ink transition-colors hover:bg-bone/85"
              >
                Shop the drop
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Ticker />

      <section className="mx-auto max-w-[1600px] px-4 py-16 sm:px-8">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 border-b border-border pb-4">
          <h2 className="display text-3xl sm:text-5xl">The Drop</h2>
          <Link to="/shop" className="label shrink-0 text-muted-foreground hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto grid max-w-[1600px] items-stretch gap-0 lg:grid-cols-2">
          <img
            src={editorialImg}
            alt="Chalked hands on a barbell"
            loading="lazy"
            width={1024}
            height={1280}
            className="h-full max-h-[70vh] w-full object-cover"
          />
          <div className="flex flex-col justify-center gap-6 px-4 py-16 sm:px-12">
            <p className="label text-muted-foreground">The standard</p>
            <h2 className="display text-4xl sm:text-6xl">
              Built in the <span className="text-muted-foreground">gym</span>, worn in
              the <span className="text-muted-foreground">street</span>
            </h2>
            <p className="max-w-prose text-sm text-muted-foreground">
              [Placeholder campaign copy — final brand messaging to be supplied.]
            </p>
            <Link
              to="/about"
              className="label w-fit border border-bone px-6 py-3 transition-colors hover:bg-bone hover:text-ink"
            >
              About the brand
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto flex max-w-[1600px] flex-col items-start gap-6 px-4 py-16 sm:px-8 md:flex-row md:items-center md:justify-between">
          <h2 className="display text-3xl sm:text-5xl">
            Questions? <span className="text-muted-foreground">Talk to us.</span>
          </h2>
          <Link
            to="/contact"
            className="display bg-bone px-8 py-4 text-lg text-ink transition-colors hover:bg-bone/85"
          >
            Contact
          </Link>
        </div>
      </section>
    </>
  );
}
