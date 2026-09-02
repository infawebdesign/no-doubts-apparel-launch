import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  formatPrice,
  getProduct,
  products,
  type Product,
} from "@/lib/products";
import {
  STORE_ERROR_MESSAGE,
  findSquareItem,
  itemCurrency,
  itemPriceAmount,
  sortedVariations,
  squareCatalogQuery,
} from "@/lib/square-catalog";
import { useCart } from "@/lib/cart";
import { ProductCard } from "@/components/site/ProductCard";


export const Route = createFileRoute("/product/$slug")({
  loader: ({ params }) => {
    const product = getProduct(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Product not found — No Doubts Apparel" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `${loaderData.product.name} — No Doubts Apparel`;
    const description = `${loaderData.product.name}: ${loaderData.product.tagline}. No Doubts Apparel drop 001.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  return <ProductDetail key={product.id} product={product} />;
}

function ProductDetail({ product }: { product: Product }) {
  const [activeImage, setActiveImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const { data, isPending } = useQuery(squareCatalogQuery);
  const squareItem = findSquareItem(data, product.squareName);
  const liveVariations = sortedVariations(squareItem);
  // When the live catalog is unreachable, fall back to the static size run
  // (display only — purchasing still requires live Square variation IDs).
  const liveAvailable = liveVariations.length > 0;
  const variations: SquareVariation[] = liveAvailable
    ? liveVariations
    : product.sizes.map((size) => ({
        id: "",
        name: size,
        priceAmount: product.priceCents,
        currency: "CAD",
        inventoryQuantity: null,
        inStock: true,
      }));
  const selected =
    variations.find((v) => (v.name ?? "") === selectedSize) ?? null;
  const price =
    selected?.priceAmount ?? itemPriceAmount(squareItem) ?? product.priceCents;
  const currency = itemCurrency(squareItem);
  const { addLine } = useCart();
  const [added, setAdded] = useState(false);

  const canAdd = Boolean(
    liveAvailable && selected && selected.id && selected.inStock,
  );

  const handleAdd = () => {
    if (!squareItem || !selected || !selected.inStock) return;
    addLine({
      squareItemId: squareItem.id,
      squareVariationId: selected.id,
      name: product.name,
      slug: product.slug,
      size: selected.name ?? "",
      priceAmount: selected.priceAmount,
      currency: selected.currency ?? currency,
      imageUrl: product.images[0]?.url ?? null,
      imageAlt: product.images[0]?.alt ?? product.name,
    });
    setAdded(true);
  };

  const image = product.images[activeImage];
  const related = products.filter((p) => p.id !== product.id).slice(0, 3);


  return (
    <div>
      <div className="mx-auto max-w-[1600px] px-4 py-8 pt-28 sm:px-8">
        <Link to="/shop" className="label text-muted-foreground hover:text-bone">
          &larr; Back to shop
        </Link>
      </div>

      <div className="mx-auto grid max-w-[1600px] gap-10 px-4 pb-16 sm:px-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Gallery — swap image URLs for final photography without layout changes */}
        <div className="space-y-3">
          <div className="aspect-[4/5] w-full overflow-hidden border border-border bg-muted">
            {image?.url ? (
              <img
                src={image.url}
                alt={image.alt}
                width={1200}
                height={1500}
                className="size-full object-cover"
              />
            ) : (
              <div className="grid size-full place-items-center border border-dashed border-border text-center">
                <div className="px-6">
                  <p className="display text-2xl text-muted-foreground">
                    Image pending
                  </p>
                  <p className="label mt-2 text-muted-foreground">
                    Final photography TBC
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-4 gap-3">
            {product.images.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveImage(i)}
                aria-label={`View image ${i + 1}`}
                className={`aspect-square overflow-hidden border bg-muted ${
                  i === activeImage ? "border-bone" : "border-border"
                }`}
              >
                {img.url ? (
                  <img
                    src={img.url}
                    alt={img.alt}
                    loading="lazy"
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="label grid size-full place-items-center text-[9px] text-muted-foreground">
                    Pending
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:sticky lg:top-28 lg:h-fit">
          <h1 className="display text-4xl sm:text-6xl">{product.name}</h1>
          {isError ? (
            <p className="mt-4 text-sm text-muted-foreground">
              {STORE_ERROR_MESSAGE}
            </p>
          ) : (
            <>
              <p className="mt-4 text-xl font-semibold">
                {isPending ? "\u2014" : `${formatPrice(price)} ${currency}`}
              </p>
              <p className="label mt-1 text-muted-foreground">
                All sizes same price + HST
              </p>
            </>
          )}

          {!isError && (
            <div className="mt-8">
              <p className="label text-muted-foreground">Select size</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {variations.map((v) => {
                  const active = v.id === variationId;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={!v.inStock}
                      aria-disabled={!v.inStock}
                      title={v.inStock ? undefined : "Sold out"}
                      onClick={() => {
                        setVariationId(v.id);
                        setAdded(false);
                      }}
                      className={`min-w-14 border px-4 py-3 text-sm font-semibold transition-colors ${
                        !v.inStock
                          ? "cursor-not-allowed border-border text-muted-foreground line-through opacity-40"
                          : active
                            ? "border-bone bg-bone text-ink"
                            : "border-border hover:border-bone"
                      }`}
                    >
                      {v.name ?? "Size"}
                    </button>
                  );
                })}
                {isPending &&
                  [0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className="min-w-14 border border-border px-4 py-3 text-sm font-semibold text-muted-foreground opacity-40"
                    >
                      &nbsp;
                    </span>
                  ))}
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={!canAdd}
            onClick={handleAdd}
            className={`display mt-8 w-full bg-bone px-8 py-5 text-xl text-ink ${
              canAdd ? "hover:opacity-90" : "cursor-not-allowed opacity-60"
            }`}
          >
            {added ? "Added to bag" : "Add to bag"}
          </button>


          <div className="mt-10 space-y-4 border-t border-border pt-6">
            <div>
              <h2 className="label text-bone">Description</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {product.description}
              </p>
            </div>
            <div>
              <h2 className="label text-bone">Details</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                60/40 blend. Unisex sizing from XS–2XL. Price is the same across
                all sizes.
              </p>
            </div>
            <div>
              <h2 className="label text-bone">Shipping &amp; returns</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                [Shipping and returns policy to be supplied.]
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="border-t border-border">
        <div className="mx-auto max-w-[1600px] px-4 py-14 sm:px-8">
          <h2 className="display text-2xl sm:text-4xl">More from the drop</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
