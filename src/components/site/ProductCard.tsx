import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { accentClass, formatPrice, type Product } from "@/lib/products";
import {
  findSquareItem,
  itemInStock,
  itemPriceAmount,
  squareCatalogQuery,
} from "@/lib/square-catalog";

export function ProductCard({ product }: { product: Product }) {
  const cover = product.coverImage;
  const { data, isPending, isError } = useQuery(squareCatalogQuery);
  const squareItem = findSquareItem(data, product.squareName);
  // Fall back to the static price when the live catalog is unreachable.
  const price = itemPriceAmount(squareItem) ?? product.priceCents;
  const soldOut = !isPending && !isError && !!squareItem && !itemInStock(squareItem);

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
              <p className="display text-xl text-muted-foreground">Image pending</p>
              <p className="label mt-2 text-muted-foreground">Final photography TBC</p>
            </div>
          </div>
        )}
        <span className={`label absolute top-3 left-3 px-2 py-1 ${accentClass[product.colorKey]}`}>
          {soldOut ? "Sold out" : "Available"}
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 p-4">
        <div className="min-w-0">
          <h3 className="display truncate text-base sm:text-lg">{product.name}</h3>
        </div>
        <span className="shrink-0 text-sm font-semibold">
          {isPending ? "—" : formatPrice(price)}
        </span>
      </div>
    </Link>
  );
}
