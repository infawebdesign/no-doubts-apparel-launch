import { useEffect, useRef, useState } from "react";

/**
 * A marquee whose position is driven by page scroll — it drifts left as you
 * scroll down and reverses as you scroll up, with velocity-based smoothing.
 */
export function ScrollMarquee({
  images,
}: {
  images: { url: string; alt: string }[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let raf = 0;
    let current = 0;
    let lastScroll = window.scrollY;

    const tick = () => {
      const y = window.scrollY;
      const delta = y - lastScroll;
      lastScroll = y;
      // Drift left on scroll down; idle auto-drift keeps it alive
      current -= delta * 0.6 + 0.35;

      const track = trackRef.current;
      if (track) {
        const half = track.scrollWidth / 2;
        // Wrap seamlessly
        const wrapped = ((current % half) + half) % half - half;
        setOffset(wrapped);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const doubled = [...images, ...images];

  return (
    <div className="overflow-hidden border-y border-border py-6">
      <div
        ref={trackRef}
        className="flex w-max gap-4 will-change-transform"
        style={{ transform: `translate3d(${offset}px, 0, 0)` }}
      >
        {doubled.map((img, i) => (
          <img
            key={`${img.url}-${i}`}
            src={img.url}
            alt={img.alt}
            loading="lazy"
            className="aspect-[4/5] w-56 object-cover object-top sm:w-72 lg:w-80"
            draggable={false}
          />
        ))}
      </div>
    </div>
  );
}
