import { createFileRoute, Link } from "@tanstack/react-router";
import editorialImg from "@/assets/editorial-lift.jpg";
import heroImg from "@/assets/hero-campaign.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — No Doubts Apparel" },
      {
        name: "description",
        content:
          "About No Doubts Apparel: a new streetwear label shaped by gym culture and heavy graphic design.",
      },
      { property: "og:title", content: "About — No Doubts Apparel" },
      {
        property: "og:description",
        content:
          "A new streetwear label shaped by gym culture and heavy graphic design.",
      },
    ],
  }),
  component: About,
});

const PLACEHOLDER =
  "[Placeholder copy — final brand text to be supplied by No Doubts Apparel.]";

function About() {
  return (
    <div>
      <header className="mx-auto max-w-[1600px] px-4 py-12 pt-28 sm:px-8 sm:py-20 sm:pt-36">
        <p className="label text-muted-foreground">The brand</p>
        <h1 className="display mt-4 text-[14vw] leading-[0.85] sm:text-[9vw] lg:text-[8rem]">
          No <span className="text-muted-foreground">Doubts</span>
        </h1>
      </header>

      <div className="hairline h-px w-full" />

      <section className="mx-auto grid max-w-[1600px] gap-10 px-4 py-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <h2 className="display text-3xl sm:text-5xl">Our story</h2>
          <p className="text-sm text-muted-foreground">{PLACEHOLDER}</p>
          <p className="text-sm text-muted-foreground">{PLACEHOLDER}</p>
        </div>
        <img
          src={heroImg}
          alt="No Doubts Apparel campaign"
          loading="lazy"
          width={1920}
          height={1088}
          className="aspect-[4/3] w-full object-cover"
        />
      </section>

      <section className="border-y border-border">
        <div className="mx-auto grid max-w-[1600px] gap-px sm:grid-cols-3">
          {[
            { title: "What we make", color: "text-muted-foreground" },
            { title: "How we make it", color: "text-muted-foreground" },
            { title: "Where we're going", color: "text-muted-foreground" },
          ].map((block) => (
            <div key={block.title} className="border-border p-8 sm:border-r">
              <h3 className={`display text-2xl ${block.color}`}>
                {block.title}
              </h3>
              <p className="mt-4 text-sm text-muted-foreground">
                {PLACEHOLDER}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1600px] gap-10 px-4 py-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <img
          src={editorialImg}
          alt="Chalked hands on a barbell"
          loading="lazy"
          width={1024}
          height={1280}
          className="aspect-[4/5] w-full object-cover"
        />
        <div className="flex flex-col justify-center gap-6">
          <h2 className="display text-3xl sm:text-5xl">The artwork</h2>
          <p className="text-sm text-muted-foreground">{PLACEHOLDER}</p>
          <Link
            to="/shop"
            className="display w-fit bg-bone px-8 py-4 text-lg text-ink transition-colors hover:bg-bone/85"
          >
            Shop the drop
          </Link>
        </div>
      </section>
    </div>
  );
}
