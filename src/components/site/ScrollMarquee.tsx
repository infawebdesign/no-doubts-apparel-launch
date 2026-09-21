import { useEffect, useRef } from "react";

/** Native scrolling supports touch, trackpads and keys; page scrolling adds motion. */
export function ScrollMarquee({ images }: { images: { url: string; alt: string }[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pauseUntil = useRef(0);
  const dragging = useRef<{ x: number; left: number; pointer: number } | null>(null);
  const pause = () => {
    pauseUntil.current = Date.now() + 2500;
  };

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lastY = window.scrollY;
    const onScroll = () => {
      const delta = window.scrollY - lastY;
      lastY = window.scrollY;
      const track = trackRef.current;
      if (!track || reducedMotion.matches || dragging.current || Date.now() < pauseUntil.current)
        return;
      const bounds = track.getBoundingClientRect();
      if (bounds.bottom > 0 && bounds.top < window.innerHeight) track.scrollLeft += delta * 0.6;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const move = (direction: number) => {
    pause();
    const track = trackRef.current;
    if (track)
      track.scrollBy({
        left: direction * track.clientWidth * 0.75,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  };

  return (
    <div className="border-y border-border py-6">
      <div className="mx-auto mb-4 flex max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-8">
        <p id="gallery-help" className="text-sm text-muted-foreground">
          Drag or swipe to explore. Use the arrows for more photos.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            aria-label="Previous photos"
            aria-controls="team-gallery"
            onClick={() => move(-1)}
            className="border border-border px-4 py-2 hover:bg-muted"
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Next photos"
            aria-controls="team-gallery"
            onClick={() => move(1)}
            className="border border-border px-4 py-2 hover:bg-muted"
          >
            →
          </button>
        </div>
      </div>
      <div
        id="team-gallery"
        ref={trackRef}
        role="region"
        aria-label="No Doubts photo gallery"
        aria-describedby="gallery-help"
        tabIndex={0}
        className="flex cursor-grab gap-4 overflow-x-auto overscroll-x-contain px-4 pb-4 outline-offset-4 active:cursor-grabbing sm:px-8"
        onFocus={pause}
        onWheel={pause}
        onKeyDown={pause}
        onPointerDown={(event) => {
          pause();
          if (event.pointerType !== "mouse" || event.button !== 0) return;
          dragging.current = {
            x: event.clientX,
            left: event.currentTarget.scrollLeft,
            pointer: event.pointerId,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragging.current;
          if (drag && drag.pointer === event.pointerId)
            event.currentTarget.scrollLeft = drag.left - (event.clientX - drag.x);
        }}
        onPointerUp={() => {
          dragging.current = null;
          pause();
        }}
        onPointerCancel={() => {
          dragging.current = null;
          pause();
        }}
        onLostPointerCapture={() => {
          dragging.current = null;
        }}
      >
        {images.map((img) => (
          <img
            key={img.url}
            src={img.url}
            alt={img.alt}
            loading="lazy"
            width={640}
            height={800}
            className="aspect-[4/5] w-56 shrink-0 select-none object-cover object-top sm:w-72 lg:w-80"
            draggable={false}
          />
        ))}
      </div>
    </div>
  );
}
