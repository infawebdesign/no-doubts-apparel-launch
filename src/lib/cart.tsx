import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { MAX_QTY_PER_LINE, parseCart, type PaymentLine } from "./payment-contract";
import { fetchSquareCatalog } from "./square-catalog";
import { getProduct } from "./products";

/**
 * A cart line is keyed on the Square variation id, which is the only value
 * Square checkout will trust later. Names/sizes are display data only.
 */
export type CartLine = {
  /** Square catalog item id. */
  squareItemId: string;
  /** Square catalog variation id — required for checkout. */
  squareVariationId: string;
  /** Website product display name (not the Square name). */
  name: string;
  slug: string;
  size: string;
  quantity: number;
  /** Live Square price in cents. */
  priceAmount: number | null;
  currency: string;
  imageUrl: string | null;
  imageAlt: string;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  addLine: (line: Omit<CartLine, "quantity"> & { quantity?: number }) => void;
  removeLine: (squareVariationId: string) => void;
  clear: () => void;
  clearIfMatches: (paid: PaymentLine[]) => void;
  refreshPrices: () => Promise<boolean>;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "nd-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const currentLines = useRef(lines);
  currentLines.current = lines;
  const refreshPrices = useCallback(async () => {
    const catalog = await fetchSquareCatalog();
    const variations = new Map(
      catalog.flatMap((item) =>
        item.variations.map((variation) => [variation.id, variation] as const),
      ),
    );
    const next = currentLines.current.map((line) => {
      const variation = variations.get(line.squareVariationId);
      const product = getProduct(line.slug);
      return {
        ...line,
        priceAmount: variation?.inStock ? variation.priceAmount : null,
        imageUrl: product?.coverImage.url ?? line.imageUrl,
        imageAlt: product?.coverImage.alt ?? line.imageAlt,
      };
    });
    const changed = next.some(
      (line, i) => line.priceAmount !== currentLines.current[i]?.priceAmount,
    );
    if (
      changed ||
      next.some(
        (line, i) =>
          line.imageUrl !== currentLines.current[i]?.imageUrl ||
          line.imageAlt !== currentLines.current[i]?.imageAlt,
      )
    )
      setLines(next);
    return changed;
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length <= 20)
          setLines(
            parsed.filter(
              (line): line is CartLine =>
                line &&
                typeof line.squareVariationId === "string" &&
                typeof line.squareItemId === "string" &&
                typeof line.name === "string" &&
                typeof line.slug === "string" &&
                typeof line.size === "string" &&
                Number.isInteger(line.quantity) &&
                line.quantity > 0 &&
                line.quantity <= MAX_QTY_PER_LINE &&
                (line.priceAmount === null ||
                  (Number.isSafeInteger(line.priceAmount) && line.priceAmount > 0)) &&
                line.currency === "CAD" &&
                (line.imageUrl === null || typeof line.imageUrl === "string") &&
                typeof line.imageAlt === "string",
            ),
          );
      }
    } catch {
      // ignore unreadable storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // ignore storage failures
    }
  }, [lines, hydrated]);

  const addLine = useCallback<CartContextValue["addLine"]>((line) => {
    const quantity = line.quantity ?? 1;
    setLines((prev) => {
      const existing = prev.find((l) => l.squareVariationId === line.squareVariationId);
      if (existing) {
        const nextQuantity = Math.min(MAX_QTY_PER_LINE, existing.quantity + quantity);
        return prev
          .map((l) =>
            l.squareVariationId === line.squareVariationId
              ? {
                  ...l,
                  ...line,
                  quantity: nextQuantity,
                }
              : l,
          )
          .filter((l) => l.quantity > 0);
      }
      if (quantity <= 0) return prev;
      if (prev.length >= 20) return prev;
      return [...prev, { ...line, quantity: Math.min(MAX_QTY_PER_LINE, quantity) }];
    });
  }, []);

  const removeLine = useCallback((squareVariationId: string) => {
    setLines((prev) => prev.filter((l) => l.squareVariationId !== squareVariationId));
  }, []);

  const clear = useCallback(() => setLines([]), []);
  const clearIfMatches = useCallback((paid: PaymentLine[]) => {
    setLines((current) => {
      const cart = parseCart({
        items: current.map((line) => ({
          variationId: line.squareVariationId,
          quantity: line.quantity,
        })),
      });
      return JSON.stringify(cart) === JSON.stringify(parseCart({ items: paid })) ? [] : current;
    });
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: lines.reduce((sum, l) => sum + l.quantity, 0),
      addLine,
      removeLine,
      clear,
      clearIfMatches,
      refreshPrices,
    }),
    [lines, addLine, removeLine, clear, clearIfMatches, refreshPrices],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
