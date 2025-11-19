import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-mono text-sm text-muted">404</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight">No page here</h2>
      <p className="mt-3 max-w-md text-muted">
        The link may be out of date. The whole catalogue is on the landing page.
      </p>
      <Link
        href="/"
        className="mt-7 rounded-full bg-brand px-6 py-3 text-sm font-medium text-white hover:bg-brand-strong"
      >
        Back to the catalogue
      </Link>
    </div>
  );
}
