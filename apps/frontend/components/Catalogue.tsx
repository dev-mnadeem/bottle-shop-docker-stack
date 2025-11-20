'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  catalogueKey,
  fetchCatalogue,
  SORT_OPTIONS,
  type ProductPage,
  type SortValue,
} from '../lib/products';
import { ProductCard, ProductCardSkeleton } from './ProductCard';
import { Input, Select } from './ui/Input';
import { Button } from './ui/Button';

const SEARCH_DEBOUNCE_MS = 300;
const SKELETON_COUNT = 6;
const EAGER_IMAGE_COUNT = 3;

/**
 * The server rendered the default query and handed the result down as `fallback`,
 * keyed by the same URL this component asks for. SWR therefore paints the first
 * screen from that payload with no client request at all, and only fetches once
 * the visitor changes a filter.
 */
export function Catalogue({ initialKey, fallback }: { initialKey: string; fallback: ProductPage }) {
  const [term, setTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [sort, setSort] = useState<SortValue>('newest');

  // Debounced so typing eight characters is one request, not eight.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(term.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term]);

  const key = useMemo(
    () => catalogueKey({ q: debouncedTerm || undefined, sort }),
    [debouncedTerm, sort],
  );

  const { data, error, isLoading, mutate } = useSWR<ProductPage>(key, fetchCatalogue, {
    fallback: { [initialKey]: fallback },
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  const filtered = debouncedTerm.length > 0 || sort !== 'newest';

  return (
    <section id="catalogue" className="container scroll-mt-16 py-12">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">The range</h2>
          <p className="mt-1.5 text-muted">
            {data ? `${data.total} ${data.total === 1 ? 'bottle' : 'bottles'}` : 'Loading'}
            {debouncedTerm ? ` matching “${debouncedTerm}”` : ''}
          </p>
        </div>

        <div className="flex w-full gap-3 sm:w-auto">
          <label className="w-full sm:w-64">
            <span className="sr-only">Search the catalogue</span>
            <Input
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search bottles…"
            />
          </label>
          <label>
            <span className="sr-only">Sort products</span>
            <Select value={sort} onChange={(e) => setSort(e.target.value as SortValue)}>
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
        </div>
      </div>

      <div className="mt-8">
        {error ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-900"
          >
            <p className="font-medium">The catalogue did not load.</p>
            <p className="mt-1 text-red-800/80">
              The API may be starting up or rate limiting this address.
            </p>
            <Button variant="secondary" className="mt-4" onClick={() => void mutate()}>
              Try again
            </Button>
          </div>
        ) : isLoading && !data ? (
          <div
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            aria-busy="true"
            aria-live="polite"
          >
            {Array.from({ length: SKELETON_COUNT }, (_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : data && data.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white p-12 text-center">
            <p className="font-medium text-ink">Nothing matches that search.</p>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">
              Try a material — glass, steel, bamboo — or clear the filters to see the whole range.
            </p>
            {filtered && (
              <Button
                variant="secondary"
                className="mt-5"
                onClick={() => {
                  setTerm('');
                  setSort('newest');
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
            {data?.items.map((product, i) => (
              <ProductCard key={product.id} product={product} priority={i < EAGER_IMAGE_COUNT} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
