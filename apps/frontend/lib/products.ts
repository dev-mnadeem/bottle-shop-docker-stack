import { apiFetch } from './api';

export interface Product {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  /** Path into the app's public/ directory, or an absolute https URL. */
  imageUrl: string;
  shortDescription: string;
}

export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name_asc', label: 'Name: A to Z' },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]['value'];

export interface CatalogueQuery {
  q?: string;
  sort?: SortValue;
  page?: number;
  limit?: number;
}

/** Builds the query string once, so SSR and the client ask for identical URLs. */
export function catalogueKey(query: CatalogueQuery): string {
  const params = new URLSearchParams();
  params.set('page', String(query.page ?? 1));
  params.set('limit', String(query.limit ?? 12));
  params.set('sort', query.sort ?? 'newest');
  if (query.q) params.set('q', query.q);
  return `/products?${params.toString()}`;
}

export function fetchCatalogue(key: string): Promise<ProductPage> {
  return apiFetch<ProductPage>(key);
}

export const EMPTY_PAGE: ProductPage = { items: [], total: 0, page: 1, limit: 12, pages: 1 };

/** Prices are integer minor units end to end — no float arithmetic on money. */
export function formatPrice(priceCents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    priceCents / 100,
  );
}
