import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, ShoppingBag } from "lucide-react";

const nav = [
  { to: "/shop", label: "Shop" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <div className="mx-auto grid max-w-[1700px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-5 sm:px-8">
        <Link to="/" className="display shrink-0 text-2xl tracking-tight sm:text-3xl">
          No&#8209;Doubts
        </Link>

        <nav className="hidden justify-center gap-10 md:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="label text-bone/70 transition-colors hover:text-bone"
              activeProps={{ className: "label text-bone" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-5">
          <button type="button" aria-label="Bag (0)" className="relative text-bone/80 transition-colors hover:text-bone">
            <ShoppingBag className="size-5" />
            <span className="label absolute -top-1 -right-2 text-[9px] tracking-normal">0</span>
          </button>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="md:hidden"
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="flex flex-col border-t border-border bg-ink/95 backdrop-blur md:hidden">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="display border-b border-border px-4 py-4 text-2xl"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
