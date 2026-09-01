import tigerTee from "@/assets/tiger-tee.png";
import snakeTee from "@/assets/snake-tee.png";
import scriptTee from "@/assets/script-tee.png";
import ogTee from "@/assets/og-tee.png";

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
  /** Total units available. Square inventory count maps here later. */
  stock: number | null;
  colorKey: "lime" | "cobalt" | "magenta" | "tiger";
  status: "available" | "coming-soon";
  /** Placeholder copy until final descriptions are supplied. */
  description: string;
  images: ProductImage[];
  variations: ProductVariation[];
};

const SIZES = ["XS", "S", "M", "L", "XL", "2XL"];

const sizeVariations = (slug: string): ProductVariation[] =>
  SIZES.map((size) => ({ id: `${slug}-${size}`, size, available: null }));

export const products: Product[] = [
  {
    id: "nd-tiger",
    slug: "earn-your-total",
    name: "On The Prowl Tee — Earn Your Total",
    tagline: "Tiger graphic / front print",
    priceCents: 3000,
    stock: 100,
    colorKey: "tiger",
    status: "available",
    description:
      "Striking tiger design, reminding you to have no doubts and earn the total you worked for.",
    images: [
      { url: tigerTee, alt: "On The Prowl Tee — Earn Your Total, front print" },
      { url: null, alt: "Additional photography coming soon" },
      { url: null, alt: "Additional photography coming soon" },
    ],
    variations: sizeVariations("nd-tiger"),
  },
  {
    id: "nd-snake",
    slug: "hit-the-standard",
    name: "Strike Tee — Hit The Standard",
    tagline: "Snake + dumbbell / front print",
    priceCents: 3000,
    stock: 100,
    colorKey: "cobalt",
    status: "available",
    description:
      "A strong, full back print reminding you to hit the standard with secondary ND logo on front.",
    images: [
      { url: "/snake-tee-front.png", alt: "Strike Tee — Hit The Standard, front print" },
      { url: null, alt: "Additional photography coming soon" },
      { url: null, alt: "Additional photography coming soon" },
    ],
    variations: sizeVariations("nd-snake"),
  },
  {
    id: "nd-script",
    slug: "varsity",
    name: "Varsity Tee",
    tagline: "Script wordmark / front print",
    priceCents: 3000,
    stock: 100,
    colorKey: "lime",
    status: "available",
    description:
      "Ode to a classic jersey look, \"Leave No Doubts\" with secondary ND logo on sleeve. Simple and sharp!",
    images: [
      { url: scriptTee, alt: "Varsity Tee, front print" },
      { url: null, alt: "Additional photography coming soon" },
      { url: null, alt: "Additional photography coming soon" },
    ],
    variations: sizeVariations("nd-script"),
  },
  {
    id: "nd-wordmark",
    slug: "og",
    name: "OG No Doubts Basic Tee",
    tagline: "Wordmark / front print",
    priceCents: 2500,
    stock: 100,
    colorKey: "magenta",
    status: "available",
    description:
      "Our primary logo in a clean front print for those proud to rep the brand's mindset!",
    images: [
      { url: ogTee, alt: "OG No Doubts Basic Tee, front print" },
      { url: null, alt: "Additional photography coming soon" },
      { url: null, alt: "Additional photography coming soon" },
    ],
    variations: sizeVariations("nd-wordmark"),
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
