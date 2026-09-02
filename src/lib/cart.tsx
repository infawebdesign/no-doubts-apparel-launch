import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "nd-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setLines(parsed as CartLine[]);
      }
    } catch {
      // ignore unreadable storage
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // ignore storage failures
    }
  }, [lines]);

  const addLine = useCallback<CartContextValue["addLine"]>((line) => {
    const quantity = line.quantity ?? 1;
    setLines((prev) => {
      const existing = prev.find(
        (l) => l.squareVariationId === line.squareVariationId,
      );
      if (existing) {
        return prev.map((l) =>
          l.squareVariationId === line.squareVariationId
            ? {
                ...l,
                ...line,
                quantity: l.quantity + quantity,
              }
            : l,
        );
      }
      return [...prev, { ...line, quantity }];
    });
  }, []);

  const removeLine = useCallback((squareVariationId: string) => {
    setLines((prev) =>
      prev.filter((l) => l.squareVariationId !== squareVariationId),
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: lines.reduce((sum, l) => sum + l.quantity, 0),
      addLine,
      removeLine,
      clear,
    }),
    [lines, addLine, removeLine, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
