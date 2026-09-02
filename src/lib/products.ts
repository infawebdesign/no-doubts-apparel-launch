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

export type Product = {
  id: string;
  slug: string;
  name: string;
  /** Name of the matching item in the Square catalog (source of truth). */
  squareName: string;
  tagline: string;
  colorKey: "lime" | "cobalt" | "magenta" | "tiger";
  status: "available" | "coming-soon";
  /** Placeholder copy until final descriptions are supplied. */
  description: string;
  images: ProductImage[];
};

export const products: Product[] = [
  {
    id: "nd-tiger",
    slug: "earn-your-total",
    name: "On The Prowl Tee — Earn Your Total",
    squareName: "Earn Your Total",
    tagline: "Tiger graphic / front print",
    colorKey: "tiger",
    status: "available",
    description:
      "Striking tiger design, reminding you to have no doubts and earn the total you worked for.",
    images: [
      { url: tigerTee, alt: "On The Prowl Tee — Earn Your Total, front print" },
      { url: null, alt: "Additional photography coming soon" },
      { url: null, alt: "Additional photography coming soon" },
    ],
  },
  {
    id: "nd-snake",
    slug: "hit-the-standard",
    name: "Strike Tee — Hit The Standard",
    squareName: "Hit the Standard",
    tagline: "Snake + dumbbell / front print",
    colorKey: "cobalt",
    status: "available",
    description:
      "A strong, full back print reminding you to hit the standard with secondary ND logo on front.",
    images: [
      { url: "/snake-tee-front.png", alt: "Strike Tee — Hit The Standard, front print" },
      { url: null, alt: "Additional photography coming soon" },
      { url: null, alt: "Additional photography coming soon" },
    ],
  },
  {
    id: "nd-script",
    slug: "varsity",
    name: "Varsity Tee",
    squareName: "Varsity",
    tagline: "Script wordmark / front print",
    colorKey: "lime",
    status: "available",
    description:
      "Ode to a classic jersey look, \"Leave No Doubts\" with secondary ND logo on sleeve. Simple and sharp!",
    images: [
      { url: scriptTee, alt: "Varsity Tee, front print" },
      { url: null, alt: "Additional photography coming soon" },
      { url: null, alt: "Additional photography coming soon" },
    ],
  },
  {
    id: "nd-wordmark",
    slug: "og",
    name: "OG No Doubts Basic Tee",
    squareName: "OG",
    tagline: "Wordmark / front print",
    colorKey: "magenta",
    status: "available",
    description:
      "Our primary logo in a clean front print for those proud to rep the brand's mindset!",
    images: [
      { url: ogTee, alt: "OG No Doubts Basic Tee, front print" },
      { url: null, alt: "Additional photography coming soon" },
      { url: null, alt: "Additional photography coming soon" },
    ],
  },
];

export const getProduct = (slug: string) =>
  products.find((p) => p.slug === slug);

/** Format a Square price amount (cents) for display. */
export const formatPrice = (priceCents: number | null | undefined) =>
  priceCents === null || priceCents === undefined
    ? "Price unavailable"
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
