import Link from 'next/link';

/**
 * The chrome for every page in the (site) group. The root page used to live
 * outside this group, so the header and footer declared here never rendered.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#catalogue"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to the catalogue
      </a>
      <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 rounded-full">
            <span
              aria-hidden="true"
              className="grid h-8 w-8 place-items-center rounded-full bg-brand font-display text-sm font-semibold text-white"
            >
              e
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">Eco Bottle</span>
          </Link>
          <nav aria-label="Main" className="flex items-center gap-2 text-sm sm:gap-5">
            <a
              href="#catalogue"
              className="hidden rounded-full px-2 py-1 text-muted hover:text-ink sm:inline"
            >
              Catalogue
            </a>
            <a
              href="#enquiry"
              className="rounded-full bg-brand px-4 py-2 font-medium text-white transition-colors hover:bg-brand-strong"
            >
              Talk to sales
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line bg-surface">
        <div className="container flex flex-col gap-2 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>Eco Bottle — reusable drinkware, built to be refilled.</p>
          <p>Sample catalogue. Product artwork is bundled with the app.</p>
        </div>
      </footer>
    </div>
  );
}
