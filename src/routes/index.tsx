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
  const featured = products.find((p) => p.slug === "hit-the-standard");
  return (
    <>

      <section className="relative">
        <div className="relative min-h-[86svh] overflow-hidden">
          <img
            src={heroImg}
            alt="No Doubts Apparel campaign"
            width={1920}
            height={1280}
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/25" />
          <div className="relative mx-auto flex min-h-[86svh] max-w-[1600px] flex-col justify-end px-4 pb-12 sm:px-8 sm:pb-16">
            <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <p className="label text-bone/60">Drop 001 — MMXXVI</p>
                <h1 className="display mt-5 text-[15vw] leading-[0.85] sm:text-[10vw] lg:text-[8.5rem]">
                  No Doubts
                </h1>
                <p className="display mt-4 text-xl text-bone/85 sm:text-3xl">
                  Hit the standard.
                </p>
                <Link
                  to="/shop"
                  className="label mt-8 inline-flex w-fit items-center gap-3 border border-bone px-8 py-4 transition-colors hover:bg-bone hover:text-ink"
                >
                  Shop the drop <span aria-hidden>&rarr;</span>
                </Link>
              </div>

              {featured && (
                <Link
                  to="/product/$slug"
                  params={{ slug: featured.slug }}
                  className="group hidden border border-bone/20 bg-ink/70 p-4 backdrop-blur lg:block"
                >
                  <div className="aspect-square overflow-hidden bg-card">
                    {featured.images[0]?.url && (
                      <img
                        src={featured.images[0].url}
                        alt={featured.images[0].alt}
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <p className="label mt-4 text-bone/50">New drop</p>
                  <p className="mt-1 text-sm font-semibold">{featured.name}</p>
                  <p className="label mt-3 inline-flex items-center gap-2">
                    Shop now <span aria-hidden>&rarr;</span>
                  </p>
                </Link>
              )}
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
