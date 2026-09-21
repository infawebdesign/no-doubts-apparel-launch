/**
 * Product shape mirrors what a Square Catalog item will provide.
 * When Square is connected, replace `products` with a loader that maps
 * CatalogObject -> Product. Nothing else in the UI needs to change.
 */
export type ProductImage = {
  /** Image URL. Swap for final photography or Square image URLs later. */
  url: string | null;
  alt: string;
  sizeGuide?: boolean;
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
  coverImage: ProductImage;
  images: ProductImage[];
  /** Static fallback price (cents) used only when the live Square catalog is unreachable. */
  priceCents: number;
  /** Static fallback size run used only when the live Square catalog is unreachable. */
  sizes: string[];
};

export const FALLBACK_SIZES = ["XS", "S", "M", "L", "XL", "2XL"];

export const products: Product[] = [
  {
    id: "nd-tiger",
    slug: "earn-your-total",
    name: "On The Prowl Tee — Earn Your Total",
    squareName: "Earn Your Total",
    tagline: "Tiger graphic / front print",
    colorKey: "tiger",
    status: "available",
    priceCents: 3000,
    sizes: FALLBACK_SIZES,
    description:
      "Striking tiger design, reminding you to have no doubts and earn the total you worked for.",
    coverImage: {
      url: "/campaign/NoDoubtTigerBlood-Single-Male-Front-Full.webp",
      alt: "On The Prowl Tee, male model front view",
    },
    images: [
      {
        url: "/campaign/NoDoubtTigerBlood-Single-Female-Front-Full.webp",
        alt: "On The Prowl Tee, female model front view",
      },
      {
        url: "/campaign/NoDoubtTigerBlood-Single-Male-Side-Full.webp",
        alt: "On The Prowl Tee, male model side view",
      },
      {
        url: "/campaign/NoDoubtTigerBlood-Product-Front-Full-Web.webp",
        alt: "On The Prowl Tee, front graphic detail",
      },
      { url: "/campaign/IMG_2675.webp", alt: "T-shirt size guide", sizeGuide: true },
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
    priceCents: 3000,
    sizes: FALLBACK_SIZES,
    description:
      "A strong, full back print reminding you to hit the standard with secondary ND logo on front.",
    coverImage: {
      url: "/campaign/NoDoubtSnake-Group-1-Full.webp",
      alt: "The team wearing Strike tees",
    },
    images: [
      {
        url: "/campaign/NoDoubtSnake-Single-Female-Back-Full.webp",
        alt: "Strike Tee, female model back view",
      },
      {
        url: "/campaign/NoDoubtSnake-Single-Male-Front-Full.webp",
        alt: "Strike Tee, male model front view",
      },
      {
        url: "/campaign/NoDoubtSnake-Product-Back-Full.webp",
        alt: "Strike Tee, back graphic detail",
      },
      {
        url: "/campaign/NoDoubtSnake-Product-Breast-Full.webp",
        alt: "Strike Tee, chest logo detail",
      },
      { url: "/campaign/IMG_2675.webp", alt: "T-shirt size guide", sizeGuide: true },
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
    priceCents: 3000,
    sizes: FALLBACK_SIZES,
    description:
      'Ode to a classic jersey look, "Leave No Doubts" with secondary ND logo on sleeve. Simple and sharp!',
    coverImage: {
      url: "/campaign/NoDoubtVarsity-Group-Full.webp",
      alt: "The team wearing Varsity tees",
    },
    images: [
      {
        url: "/campaign/NoDoubtVarsity-Single-Male-Front-Full.webp",
        alt: "Varsity Tee, male model front view",
      },
      { url: "/campaign/NoDoubtVarsity-Group-Full.webp", alt: "The team wearing Varsity tees" },
      {
        url: "/campaign/NoDoubtVarsity-Single-Female-Side-Full.webp",
        alt: "Varsity Tee, female model side view",
      },
      {
        url: "/campaign/NoDoubtVarsity-Product-Front-Full.webp",
        alt: "Varsity Tee, front graphic detail",
      },
      { url: "/campaign/IMG_2675.webp", alt: "T-shirt size guide", sizeGuide: true },
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
    priceCents: 2500,
    sizes: FALLBACK_SIZES,
    description:
      "Our primary logo in a clean front print for those proud to rep the brand's mindset!",
    coverImage: {
      url: "/campaign/NoDoubtOG-Single-Male-Front-Alt-Full.webp",
      alt: "OG Basic Tee, male model front view",
    },
    images: [
      {
        url: "/campaign/NoDoubtOG-Single-Female-Side-Full.webp",
        alt: "OG Basic Tee, female model side view",
      },
      {
        url: "/campaign/NoDoubtOG-Single-Male-Front-Alt-Full.webp",
        alt: "OG Basic Tee, male model front view",
      },
      {
        url: "/campaign/NoDoubtOG-Product-Front-Full.webp",
        alt: "OG Basic Tee, front logo detail",
      },
      { url: "/campaign/IMG_2675.webp", alt: "T-shirt size guide", sizeGuide: true },
    ],
  },
];

export const getProduct = (slug: string) => products.find((p) => p.slug === slug);

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
