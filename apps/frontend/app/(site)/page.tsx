import { Catalogue } from '../../components/Catalogue';
import { EnquiryForm } from '../../components/EnquiryForm';
import { Hero } from '../../components/Hero';
import { apiFetch } from '../../lib/api';
import { catalogueKey, EMPTY_PAGE, type ProductPage } from '../../lib/products';

/**
 * The landing page is rendered per request so the catalogue is never stale, and
 * the fetched page is handed to the client component as an SWR fallback rather
 * than re-fetched in the browser.
 */
export const dynamic = 'force-dynamic';

const INITIAL_KEY = catalogueKey({ page: 1, limit: 12, sort: 'newest' });

async function loadCatalogue(): Promise<ProductPage> {
  try {
    return await apiFetch<ProductPage>(INITIAL_KEY, { cache: 'no-store' });
  } catch {
    // A landing page that 500s because the API is booting is worse than one that
    // renders its copy and lets the client retry the grid.
    return EMPTY_PAGE;
  }
}

export default async function LandingPage() {
  const initial = await loadCatalogue();

  return (
    <>
      <Hero productCount={initial.total} />
      <Catalogue initialKey={INITIAL_KEY} fallback={initial} />
      <EnquiryForm />
    </>
  );
}
