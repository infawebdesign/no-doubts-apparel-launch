import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t border-border">
      
      <div className="mx-auto grid max-w-[1600px] gap-10 px-4 py-14 sm:px-8 md:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <p className="display text-4xl sm:text-6xl">No&nbsp;Doubts Apparel</p>
          <p className="label mt-4 text-muted-foreground">
            Checkout is handled by Square — integration pending
          </p>
        </div>
        <div className="grid grid-cols-2 gap-10 sm:gap-16">
          <div className="space-y-3">
            <p className="label text-muted-foreground">Browse</p>
            <Link to="/shop" className="block text-sm hover:text-bone">
              Shop
            </Link>
            <Link to="/about" className="block text-sm hover:text-bone">
              About
            </Link>
            <Link to="/contact" className="block text-sm hover:text-bone">
              Contact
            </Link>
          </div>
          <div className="space-y-3">
            <p className="label text-muted-foreground">Info</p>
            <p className="text-sm text-muted-foreground">
              [Shipping policy TBC]
            </p>
            <p className="text-sm text-muted-foreground">[Returns TBC]</p>
            <p className="text-sm text-muted-foreground">[Size guide TBC]</p>
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1600px] flex-col gap-2 border-t border-border px-4 py-6 text-[11px] tracking-[0.2em] text-muted-foreground uppercase sm:flex-row sm:justify-between sm:px-8">
        <span>&copy; {new Date().getFullYear()} No Doubts Apparel</span>
        <span>Leave No Doubts</span>
      </div>
    </footer>
  );
}
