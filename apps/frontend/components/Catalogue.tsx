'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import {
  catalogueKey,
  fetchCatalogue,
  SORT_OPTIONS,
  type ProductPage,
  type SortValue,
} from '../lib/products';
import { ProductCard, ProductCardSkeleton } from './ProductCard';
import { Button } from './ui/Button';
import { Input, Select } from './ui/Input';

const SEARCH_DEBOUNCE_MS = 300;
const SKELETON_COUNT = 6;
const EAGER_IMAGE_COUNT = 3;

/**
 * The server rendered the default query and handed the result down as `fallback`,
 * keyed by the same URL this component asks for, so the first screen paints from
 * that payload. A null fallback means the server could not reach the API; the
 * grid then loads from the browser with its own skeleton and error states.
 */
export function Catalogue({
  initialKey,
  fallback,
}: {
  initialKey: string;
  fallback: ProductPage | null;
}) {
  const [term, setTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [sort, setSort] = useState<SortValue>('newest');
  const [page, setPage] = useState(1);

  // Debounced so typing eight characters is one request, not eight. A new term
  // starts again from page one; page four of the old results means nothing.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(term.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term]);

  const key = catalogueKey({ q: debouncedTerm || undefined, sort, page });

  const { data, error, isLoading, isValidating, mutate } = useSWR<ProductPage>(
    key,
    fetchCatalogue,
    {
      fallback: fallback ? { [initialKey]: fallback } : {},
      keepPreviousData: true,
      revalidateOnFocus: false,
    },
  );

  const filtered = debouncedTerm.length > 0 || sort !== 'newest';

  const changePage = (next: number) => {
    setPage(next);
    document.getElementById('catalogue')?.scrollIntoView({ block: 'start' });
  };

  return (
    <section id="catalogue" aria-labelledby="catalogue-heading" className="scroll-mt-16">
      <div className="container py-12 sm:py-16">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="catalogue-heading" className="text-3xl font-semibold tracking-tight text-ink">
              The range
            </h2>
            <p className="mt-1.5 text-muted" aria-live="polite">
              {data
                ? `${data.total} ${data.total === 1 ? 'bottle' : 'bottles'}${
                    debouncedTerm ? ` matching “${debouncedTerm}”` : ''
                  }`
                : error
                  ? 'Unavailable right now'
                  : 'Loading the catalogue…'}
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <div className="w-full sm:w-64">
              <label htmlFor="catalogue-search" className="sr-only">
                Search the catalogue
              </label>
              <Input
                id="catalogue-search"
                type="search"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search glass, steel, bamboo…"
              />
            </div>
            <div className="w-full sm:w-auto">
              <label htmlFor="catalogue-sort" className="sr-only">
                Sort products
              </label>
              <Select
                id="catalogue-sort"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as SortValue);
                  setPage(1);
                }}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        <div className="mt-8">
          {error && !data ? (
            <div
              role="alert"
              className="rounded-2xl border border-clay/30 bg-clay-tint p-6 text-sm text-ink"
            >
              <p className="font-semibold">The catalogue did not load.</p>
              <p className="mt-1 text-muted">
                The API may be starting up or rate limiting this address.
              </p>
              <Button variant="secondary" className="mt-4" onClick={() => void mutate()}>
                Try again
              </Button>
            </div>
          ) : isLoading && !data ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
              {Array.from({ length: SKELETON_COUNT }, (_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : data && data.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center sm:p-12">
              <p className="font-display text-xl text-ink">Nothing matches that search.</p>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">
                Try a material — glass, steel, bamboo — or clear the filters to see the whole range.
              </p>
              {filtered && (
                <Button
                  variant="secondary"
                  className="mt-5"
                  onClick={() => {
                    setTerm('');
                    setDebouncedTerm('');
                    setSort('newest');
                    setPage(1);
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <ul
              className={`grid grid-cols-1 gap-6 transition-opacity sm:grid-cols-2 lg:grid-cols-3 ${
                isValidating ? 'opacity-70' : ''
              }`}
            >
              {data?.items.map((product, i) => (
                <li key={product.id} className="flex">
                  <ProductCard product={product} priority={page === 1 && i < EAGER_IMAGE_COUNT} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {data && data.pages > 1 && (
          <nav
            aria-label="Catalogue pages"
            className="mt-10 flex items-center justify-between gap-4 border-t border-line pt-6"
          >
            <Button
              variant="secondary"
              disabled={data.page <= 1}
              onClick={() => changePage(data.page - 1)}
            >
              Previous
            </Button>
            <p className="text-sm text-muted">
              Page {data.page} of {data.pages}
            </p>
            <Button
              variant="secondary"
              disabled={data.page >= data.pages}
              onClick={() => changePage(data.page + 1)}
            >
              Next
            </Button>
          </nav>
        )}
      </div>
    </section>
  );
}
