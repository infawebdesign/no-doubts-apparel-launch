import tigerTee from "@/assets/tiger-tee.png.asset.json";
import snakeTee from "@/assets/snake-tee.png.asset.json";
import scriptTee from "@/assets/script-tee.png.asset.json";

/**
 * Product shape mirrors what a Square Catalog item will provide.
 * When Square is connected, replace `products` with a loader that maps
 * CatalogObject -> Product. Nothing else in the UI needs to change.
 */
export type ProductImage = {
  /** Image URL. Swap for final photography or Square image URLs later. */
  url: string | null;
  alt: string;
};

export type ProductVariation = {
  /** Square catalog variation id goes here later. */
  id: string;
  size: string;
  /** Populated from Square inventory later. `null` = unknown / not yet synced. */
  available: boolean | null;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  /** Price in cents. Square is the source of truth once connected. */
  priceCents: number | null;
  colorKey: "lime" | "cobalt" | "magenta" | "tiger";
  status: "available" | "coming-soon";
  /** Placeholder copy until final descriptions are supplied. */
  description: string;
  images: ProductImage[];
  variations: ProductVariation[];
};

const SIZES = ["S", "M", "L", "XL", "2XL"];

const sizeVariations = (slug: string): ProductVariation[] =>
  SIZES.map((size) => ({ id: `${slug}-${size}`, size, available: null }));

export const products: Product[] = [
  {
    id: "nd-tiger",
    slug: "earn-your-stripes",
    name: "Earn Your Stripes Tee",
    tagline: "Tiger graphic / front print",
    priceCents: null,
    colorKey: "tiger",
    status: "available",
    description:
      "[Placeholder description — final product copy to be supplied. Do not treat this text as final.]",
    images: [
      { url: tigerTee.url, alt: "Earn Your Stripes tee, front print" },
      { url: null, alt: "Additional photography coming soon" },
      { url: null, alt: "Additional photography coming soon" },
    ],
    variations: sizeVariations("nd-tiger"),
  },
  {
    id: "nd-snake",
    slug: "hit-the-standard",
    name: "Hit The Standard Tee",
    tagline: "Snake + dumbbell / back print",
    priceCents: 5500,
    colorKey: "cobalt",
    status: "available",
    description:
      "[Placeholder description — final product copy to be supplied. Do not treat this text as final.]",
    images: [
      { url: snakeTee.url, alt: "Hit The Standard tee, front and back" },
      { url: null, alt: "Additional photography coming soon" },
      { url: null, alt: "Additional photography coming soon" },
    ],
    variations: sizeVariations("nd-snake"),
  },
  {
    id: "nd-script",
    slug: "leave-no-doubts",
    name: "Leave No Doubts Script Tee",
    tagline: "Script wordmark / front print",
    priceCents: null,
    colorKey: "lime",
    status: "available",
    description:
      "[Placeholder description — final product copy to be supplied. Do not treat this text as final.]",
    images: [
      { url: scriptTee.url, alt: "Leave No Doubts script tee" },
      { url: null, alt: "Additional photography coming soon" },
      { url: null, alt: "Additional photography coming soon" },
    ],
    variations: sizeVariations("nd-script"),
  },
  {
    id: "nd-four",
    slug: "product-four",
    name: "Product Four",
    tagline: "Artwork to be announced",
    priceCents: null,
    colorKey: "magenta",
    status: "coming-soon",
    description:
      "[Placeholder — product name, artwork and copy to be supplied.]",
    images: [{ url: null, alt: "Product image placeholder" }],
    variations: sizeVariations("nd-four"),
  },
];

export const getProduct = (slug: string) =>
  products.find((p) => p.slug === slug);

export const formatPrice = (priceCents: number | null) =>
  priceCents === null
    ? "Price TBC"
    : `$${(priceCents / 100).toFixed(2)}`;

export const accentClass: Record<Product["colorKey"], string> = {
  lime: "bg-bone text-ink",
  cobalt: "bg-bone text-ink",
  magenta: "bg-bone text-ink",
  tiger: "bg-bone text-ink",
};

export const accentText: Record<Product["colorKey"], string> = {
  lime: "text-muted-foreground",
  cobalt: "text-muted-foreground",
  magenta: "text-muted-foreground",
  tiger: "text-muted-foreground",
};
