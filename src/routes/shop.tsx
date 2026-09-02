import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { squareCatalogQuery } from "@/lib/square-catalog";
import { products } from "@/lib/products";
import { ProductCard } from "@/components/site/ProductCard";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop — No Doubts Apparel" },
      {
        name: "description",
        content:
          "Shop the first No Doubts Apparel drop: graphic gym-bred tees. Checkout handled securely by Square.",
      },
      { property: "og:title", content: "Shop — No Doubts Apparel" },
      {
        property: "og:description",
        content: "Shop the first No Doubts Apparel drop of graphic gym tees.",
      },
    ],
  }),
  component: Shop,
});

function Shop() {
  const { isError } = useQuery(squareCatalogQuery);
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-12 pt-28 sm:px-8 sm:py-16 sm:pt-32">
      <header className="border-b border-border pb-6">
        <h1 className="display text-5xl sm:text-8xl">Shop All</h1>
      </header>

      {isError && (
        <p className="mt-6 text-sm text-muted-foreground">{STORE_ERROR_MESSAGE}</p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
