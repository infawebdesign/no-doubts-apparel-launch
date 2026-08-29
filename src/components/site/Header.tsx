import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const nav = [
  { to: "/shop", label: "Shop" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto grid max-w-[1600px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 sm:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-3">
          <span className="grid size-9 place-items-center border-2 border-bone font-display text-[13px] leading-none">
            ND
          </span>
          <span className="display hidden text-lg sm:block">No&nbsp;Doubts</span>
        </Link>

        <nav className="hidden justify-center gap-8 md:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="label text-muted-foreground transition-colors hover:text-bone"
              activeProps={{ className: "label text-bone" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-4">
          <span className="label hidden text-muted-foreground sm:block">
            Cart (0)
          </span>
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
        <nav className="flex flex-col border-t border-border md:hidden">
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
      <div className="rainbow-rule h-1 w-full" />
    </header>
  );
}
