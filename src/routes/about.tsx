import { createFileRoute, Link } from "@tanstack/react-router";
import ceoImg from "@/assets/team-NoDoubtCEO-Group-1-Full.jpg";
import tigerGroup from "@/assets/team-NoDoubtTigerBlood-Group-Full.jpg";
import snakeGroup1 from "@/assets/team-NoDoubtSnake-Group-1-Full.jpg";
import snakeGroup2 from "@/assets/team-NoDoubtSnake-Group-2-Full.jpg";
import varsityGroup from "@/assets/team-NoDoubtVarsity-Group-Full.jpg";
import renaissanceGroup from "@/assets/team-NoDoubtRenaissance-Group-Full.jpg";
import allStylesGroup from "@/assets/team-NoDoubtAllStyles-Group-Full.jpg";
import { ScrollMarquee } from "@/components/site/ScrollMarquee";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — No Doubts Apparel" },
      {
        name: "description",
        content:
          "No Doubts Apparel was created by Sarah and Francesco Catalano — powerlifters and meet directors from Guelph, Ontario. No Doubts isn't just a name. It's a mindset.",
      },
      { property: "og:title", content: "About — No Doubts Apparel" },
      {
        property: "og:description",
        content:
          "Founded by powerlifters Sarah and Francesco Catalano. No Doubts isn't just a name. It's a mindset.",
      },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div>
      <header className="mx-auto max-w-[1600px] px-4 py-12 pt-28 sm:px-8 sm:py-20 sm:pt-36">
        <h1 className="display text-[14vw] leading-[0.85] sm:text-[9vw] lg:text-[8rem]">
          No <span className="text-muted-foreground">Doubts</span>
        </h1>
      </header>

      <div className="hairline h-px w-full" />

      {/* Founders */}
      <section className="mx-auto grid max-w-[1600px] items-center gap-10 px-4 py-16 sm:px-8 lg:grid-cols-[1fr_0.65fr]">
        <div className="space-y-6 pl-0 sm:pl-8 lg:pl-16">
          <p className="label text-sm uppercase tracking-widest text-muted-foreground">
            Meet the founders
          </p>
          <h2 className="display text-3xl sm:text-5xl">
            Sarah &amp; Francesco Catalano
          </h2>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-base">
            As powerlifters and meet directors, we've experienced this sport
            from both sides of the platform: as competitors chasing our own
            PRs, and as the people behind the scenes making sure others get
            their shot at theirs. We're based in Guelph, Ontario, raising two
            young boys, and running Catalano Events, an events company hosting
            premier powerlifting meets.
          </p>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-base">
            We've been involved in this sport for 10+ years; it's how we met
            each other, and it's shaped nearly every part of our lives since.
          </p>
        </div>
        <img
          src={ceoImg}
          alt="Sarah and Francesco Catalano - creators of No Doubts Apparel"
          loading="lazy"
          width={1143}
          height={1600}
          className="mx-auto aspect-[4/5] w-full max-w-sm object-cover object-top lg:max-w-xs xl:max-w-sm"
        />
      </section>

      {/* Credentials + Why No Doubts exists */}
      <section className="border-y border-border">
        <div className="mx-auto grid max-w-[1600px] gap-px lg:grid-cols-2">
          {/* Left: interactive credential cards */}
          <div className="grid gap-px divide-y divide-border border-border lg:divide-y-0 lg:divide-x lg:border-r">
            {[
              {
                title: "10+ years",
                text: "Competing on the platform and directing the meets where other lifters chase theirs.",
              },
              {
                title: "Both sides of the platform",
                text: "Competitors chasing PRs, and meet directors making sure others get their shot.",
              },
              {
                title: "Guelph, Ontario",
                text: "Home of No Doubts Apparel and Catalano Events, hosting premier powerlifting meets.",
              },
            ].map((block, i, arr) => (
              <div
                key={block.title}
                className={`group relative bg-background p-8 transition-colors duration-300 hover:bg-muted ${
                  i < arr.length - 1 ? "lg:border-b lg:border-border" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="display text-2xl transition-colors duration-300 group-hover:text-bone">
                    {block.title}
                  </h3>
                  <span className="display text-2xl text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:text-bone">
                    →
                  </span>
                </div>
                <p className="mt-4 text-sm text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
                  {block.text}
                </p>
                <span className="absolute bottom-0 left-0 h-px w-0 bg-bone transition-all duration-500 group-hover:w-full" />
              </div>
            ))}
          </div>

          {/* Right: Why No Doubts exists */}
          <div className="space-y-6 p-8 sm:p-12 lg:p-16">
            <h2 className="display text-3xl sm:text-5xl">Why No Doubts exists</h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              We created No Doubts Apparel to represent the confidence that comes
              from putting in the work, trusting your preparation, and knowing
              you're capable of more than you think. We've seen what that belief
              does under a heavy bar, and we've seen it carry into careers,
              relationships, and everyday life: for us and for the lifters we've
              cheered for on our platform. That's why we started an apparel
              company built around it.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              We wanted to create gear that looks and feels as strong and bold as
              the work you put in. Each design represents something you can
              proudly wear on the platform, at the gym, or out in the world.
            </p>
          </div>
        </div>
      </section>

      {/* Photo gallery — scroll-driven marquee */}
      <section className="pt-10">
        <div className="mx-auto max-w-[1600px] px-4 pb-10 pt-6 sm:px-8">
          <h2 className="display text-3xl sm:text-5xl">Photo gallery</h2>
        </div>
        <ScrollMarquee
          images={[
            {
              url: ceoImg,
              alt: "Sarah and Francesco Catalano in No Doubts tees",
            },
            {
              url: tigerGroup,
              alt: "The team wearing the On The Prowl tiger tee",
            },
            {
              url: varsityGroup,
              alt: "The team wearing the Varsity tee",
            },
            {
              url: snakeGroup1,
              alt: "The team wearing the Strike snake tee",
            },
            {
              url: renaissanceGroup,
              alt: "No Doubts team group photo",
            },
            {
              url: snakeGroup2,
              alt: "The team in Strike tees at a meet",
            },
            {
              url: allStylesGroup,
              alt: "The full No Doubts collection worn by the team",
            },
          ]}
        />
      </section>

      {/* Mindset statement */}
      <section className="border-y border-border">
        <div className="mx-auto max-w-[1600px] px-4 py-20 sm:px-8 sm:py-28">
          <h2 className="display max-w-5xl text-4xl leading-[1.05] sm:text-6xl lg:text-7xl">
            No Doubts isn't just a name.{" "}
            <span className="text-muted-foreground">It's a mindset.</span>
          </h2>
          <p className="mt-8 max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-base">
            Stop doubting yourself and start trusting that you're capable of
            more than you think. We can't wait to see you all in our gear.
          </p>
          <Link
            to="/shop"
            className="display mt-10 inline-flex w-fit bg-bone px-8 py-4 text-lg text-ink transition-colors hover:bg-bone/85"
          >
            Shop the collection
          </Link>
        </div>
      </section>
    </div>
  );
}
