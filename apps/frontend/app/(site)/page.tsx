import { Catalogue } from '../../components/Catalogue';
import { EnquiryForm } from '../../components/EnquiryForm';
import { Hero } from '../../components/Hero';
import { apiFetch } from '../../lib/api';
import { catalogueKey, type ProductPage } from '../../lib/products';

/**
 * The landing page is rendered per request so the catalogue is never stale, and
 * the fetched page is handed to the client component as an SWR fallback rather
 * than re-fetched in the browser.
 */
export const dynamic = 'force-dynamic';

const INITIAL_KEY = catalogueKey({ page: 1, sort: 'newest' });

/**
 * null when the API could not be reached. The page still renders its copy, and
 * the catalogue fetches from the browser and shows its own loading and error
 * states — handing down an empty page instead made a booting API look like an
 * empty catalogue.
 */
async function loadCatalogue(): Promise<ProductPage | null> {
  try {
    return await apiFetch<ProductPage>(INITIAL_KEY, { cache: 'no-store', retries: 0 });
  } catch {
    return null;
  }
}

export default async function LandingPage() {
  const initial = await loadCatalogue();

  return (
    <>
      <Hero productCount={initial?.total ?? null} />
      <Catalogue initialKey={INITIAL_KEY} fallback={initial} />
      <EnquiryForm />
    </>
  );
}
