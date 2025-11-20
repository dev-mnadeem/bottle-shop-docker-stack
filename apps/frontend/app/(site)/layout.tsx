import Link from 'next/link';

/**
 * The chrome for every page in the (site) group. The root page used to live
 * outside this group, so the header and footer declared here never rendered.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-white/85 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span
              aria-hidden="true"
              className="grid h-8 w-8 place-items-center rounded-full bg-brand text-sm text-white"
            >
              EB
            </span>
            Eco Bottle
          </Link>
          <nav className="flex items-center gap-6 text-sm text-muted">
            <a href="#catalogue" className="hover:text-ink">
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

      <footer className="border-t border-line bg-white">
        <div className="container flex flex-col gap-2 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>Eco Bottle — reusable drinkware, built to be refilled.</p>
          <p>Sample catalogue — product artwork is bundled with the app.</p>
        </div>
      </footer>
    </div>
  );
}
