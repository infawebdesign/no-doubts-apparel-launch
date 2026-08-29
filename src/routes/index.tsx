import { createFileRoute, Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero-campaign.jpg";
import editorialImg from "@/assets/editorial-lift.jpg";
import { formatPrice, products } from "@/lib/products";
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
  const featured = products.find((p) => p.slug === "earn-your-stripes");
  return (
    <>

      <section className="relative">
        <div className="relative min-h-[100svh] overflow-hidden">
          <img
            src={heroImg}
            alt="No Doubts Apparel campaign — Earn Your Stripes tee"
            width={1920}
            height={1152}
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-ink/40" />
          <div className="relative mx-auto flex min-h-[100svh] max-w-[1700px] flex-col justify-end px-4 pt-28 pb-12 sm:px-8 sm:pb-16">
            <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div>
<h1 className="display text-[11vw] leading-[0.85] sm:text-[8vw] lg:text-[6.5rem]">
                   No&#8209;Doubts
                 </h1>
                <p className="display mt-6 text-lg text-bone sm:text-2xl">
                  Hit the standard.
                  <br />
                  Earn your total.
                  <br />
                  Leave no doubts.
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
                  className="group hidden border border-bone/25 bg-ink/60 p-5 backdrop-blur-md lg:block"
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
                  <p className="display mt-5 text-xl">{featured.name}</p>
                  <p className="mt-1 text-sm text-bone/70">
                    {formatPrice(featured.priceCents)}
                  </p>
                  <span className="label mt-4 flex items-center justify-between border border-bone px-5 py-3 transition-colors group-hover:bg-bone group-hover:text-ink">
                    Shop now <span aria-hidden>&rarr;</span>
                  </span>
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
