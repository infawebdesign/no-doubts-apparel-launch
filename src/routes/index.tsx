import { createFileRoute, Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero-campaign.jpg";
import editorialImg from "@/assets/editorial-lift.jpg";
import { useQuery } from "@tanstack/react-query";
import { formatPrice, products } from "@/lib/products";
import {
  STORE_ERROR_MESSAGE,
  findSquareItem,
  itemPriceAmount,
  squareCatalogQuery,
} from "@/lib/square-catalog";
import { ProductCard } from "@/components/site/ProductCard";

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
  const featured = products.find((p) => p.slug === "earn-your-total");
  const { data, isPending, isError } = useQuery(squareCatalogQuery);
  const featuredPrice = itemPriceAmount(
    findSquareItem(data, featured?.squareName ?? ""),
  );
  return (
    <>

      <section className="relative">
        <div className="relative min-h-[100svh]">
          <img
            src={heroImg}
            alt="No Doubts Apparel campaign — Earn Your Total tee"
            width={1920}
            height={1152}
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-ink/40" />
          <div className="relative mx-auto flex min-h-[100svh] max-w-[1700px] flex-col justify-end px-4 pt-24 pb-8 sm:px-8 sm:pb-10">
            <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div>
                <h1 className="display text-[9vw] leading-[0.85] sm:text-[7vw] lg:text-[5.5rem]">
                  No&#8209;Doubts
                </h1>
                <p className="display mt-4 text-base text-bone sm:text-xl lg:text-2xl">
                  Hit the standard.
                  <br />
                  Earn your total.
                  <br />
                  Leave no doubts.
                </p>
                <Link
                  to="/shop"
                  className="label mt-6 inline-flex w-fit items-center gap-3 border border-bone px-6 py-3 transition-colors hover:bg-bone hover:text-ink sm:px-8 sm:py-4"
                >
                  Shop the drop <span aria-hidden>&rarr;</span>
                </Link>
              </div>

              {featured && (
                <Link
                  to="/product/$slug"
                  params={{ slug: featured.slug }}
                  className="group hidden border border-bone/25 bg-ink/60 p-4 backdrop-blur-md lg:block"
                >
                  <div className="aspect-[4/5] overflow-hidden bg-card">
                    {featured.images[0]?.url && (
                      <img
                        src={featured.images[0].url}
                        alt={featured.images[0].alt}
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <p className="display mt-4 text-lg">{featured.name}</p>
                  <p className="mt-1 text-sm text-bone/70">
                    {isPending ? "\u2014" : isError ? "" : formatPrice(featuredPrice)}
                  </p>
                  <span className="label mt-3 flex items-center justify-between border border-bone px-4 py-2.5 transition-colors group-hover:bg-bone group-hover:text-ink">
                    Shop now <span aria-hidden>&rarr;</span>
                  </span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-4 py-16 sm:px-8">
        <div className="flex flex-col items-start gap-4 border-b border-border pb-4 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <h2 className="display text-3xl sm:text-5xl">Featured Collection</h2>
          <Link
            to="/shop"
            className="label inline-flex w-fit items-center gap-3 border border-bone px-6 py-3 transition-colors hover:bg-bone hover:text-ink"
          >
            Shop now <span aria-hidden>&rarr;</span>
          </Link>
        </div>
        {isError && (
          <p className="mt-6 text-sm text-muted-foreground">
            {STORE_ERROR_MESSAGE}
          </p>
        )}
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
            <h2 className="display text-4xl sm:text-6xl">
              Built by{" "}
              <span className="text-muted-foreground">powerlifters</span>, worn
              with <span className="text-muted-foreground">purpose</span>
            </h2>
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-base">
              No Doubts Apparel was founded by Sarah and Francesco Catalano —
              powerlifters and meet directors from Guelph, Ontario with over a
              decade in the sport. Every design is built around the confidence
              that comes from putting in the work and trusting your
              preparation — on the platform, in the gym, and out in the world.
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
