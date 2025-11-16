import type { Product } from '../entities/Product';

export type ProductSort = 'newest' | 'price_asc' | 'price_desc' | 'name_asc';

export interface ProductQuery {
  page: number;
  limit: number;
  /** Free-text term matched against name and short description. */
  q?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  sort: ProductSort;
}

export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ProductRepository {
  search(query: ProductQuery): Promise<ProductPage>;
  findBySlug(slug: string): Promise<Product | null>;
  findById(id: string): Promise<Product | null>;
  create(input: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product>;
  update(id: string, patch: Partial<Product>): Promise<Product | null>;
  remove(id: string): Promise<boolean>;
}
