import { Link } from "@tanstack/react-router";
import { accentClass, formatPrice, type Product } from "@/lib/products";

export function ProductCard({ product }: { product: Product }) {
  const cover = product.images[0];

  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className="group block border border-border bg-card transition-colors hover:border-bone"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        {cover?.url ? (
          <img
            src={cover.url}
            alt={cover.alt}
            loading="lazy"
            className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid size-full place-items-center border border-dashed border-border text-center">
            <div className="px-4">
              <p className="display text-xl text-muted-foreground">
                Image pending
              </p>
              <p className="label mt-2 text-muted-foreground">
                Final photography TBC
              </p>
            </div>
          </div>
        )}
        <span
          className={`label absolute top-3 left-3 px-2 py-1 ${accentClass[product.colorKey]}`}
        >
          {product.status === "available" ? "Available" : "Coming soon"}
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 p-4">
        <div className="min-w-0">
          <h3 className="display truncate text-base sm:text-lg">
            {product.name}
          </h3>
          <p className="label mt-1 truncate text-muted-foreground">
            {product.tagline}
          </p>
        </div>
        <span className="shrink-0 text-sm font-semibold">
          {formatPrice(product.priceCents)}
        </span>
      </div>
    </Link>
  );
}
