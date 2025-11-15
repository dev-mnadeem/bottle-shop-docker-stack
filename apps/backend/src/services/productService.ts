import {
  MAX_CACHEABLE_PAGE,
  PRODUCT_CACHE_TAG,
  PRODUCT_DETAIL_TTL_SECONDS,
  PRODUCT_LIST_TTL_SECONDS,
} from '../config/constants';
import type { CacheService } from './cacheService';
import type { Product } from '../entities/Product';
import type { ProductPage, ProductQuery, ProductRepository } from '../ports/productRepository';

export interface ServedProductPage extends ProductPage {
  cacheHit: boolean;
  queryMs: number;
}

export interface ServedProduct {
  product: Product;
  cacheHit: boolean;
  queryMs: number;
}

export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * All catalogue behaviour lives here: what is cacheable, how cache keys are
 * shaped, and which keys a write has to drop. Routes call these methods and do
 * nothing else, so the same rules apply however the API is reached.
 */
export class ProductService {
  constructor(
    private readonly repo: ProductRepository,
    private readonly cache: CacheService,
  ) {}

  /**
   * Only the plain catalogue is cached. A filtered query carries free text and
   * two price bounds, so its key space is effectively infinite — caching it lets
   * any client write unlimited entries that will never be read a second time.
   */
  private cacheKeyFor(query: ProductQuery): string | null {
    const filtered =
      query.q !== undefined ||
      query.minPriceCents !== undefined ||
      query.maxPriceCents !== undefined;
    if (filtered) return null;
    if (query.page > MAX_CACHEABLE_PAGE) return null;
    return `products:list:v2:sort=${query.sort}:page=${query.page}:limit=${query.limit}`;
  }

  async list(query: ProductQuery): Promise<ServedProductPage> {
    const key = this.cacheKeyFor(query);
    const startedAt = Date.now();

    if (key === null) {
      const page = await this.repo.search(query);
      return { ...page, cacheHit: false, queryMs: Date.now() - startedAt };
    }

    const { value, hit } = await this.cache.withCache(
      key,
      PRODUCT_LIST_TTL_SECONDS,
      () => this.repo.search(query),
      PRODUCT_CACHE_TAG,
    );
    return { ...value, cacheHit: hit, queryMs: Date.now() - startedAt };
  }

  async getBySlug(slug: string): Promise<ServedProduct | null> {
    const key = `products:slug:v2:${slug}`;
    const startedAt = Date.now();
    const { value, hit } = await this.cache.withCache(
      key,
      PRODUCT_DETAIL_TTL_SECONDS,
      async () => (await this.repo.findBySlug(slug)) ?? null,
      PRODUCT_CACHE_TAG,
    );
    if (value === null) {
      // A miss is cached too, so a hot 404 does not reach the database on every
      // request. It is still reported as 404 to the caller.
      return null;
    }
    return { product: value, cacheHit: hit, queryMs: Date.now() - startedAt };
  }

  async create(input: ProductInput): Promise<Product> {
    const created = await this.repo.create(input);
    await this.invalidate(created.slug);
    return created;
  }

  async update(id: string, patch: Partial<ProductInput>): Promise<Product | null> {
    const existing = await this.repo.findById(id);
    if (!existing) return null;
    const updated = await this.repo.update(id, patch);
    if (!updated) return null;
    await this.invalidate(existing.slug, updated.slug);
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    const existing = await this.repo.findById(id);
    if (!existing) return false;
    const removed = await this.repo.remove(id);
    if (removed) await this.invalidate(existing.slug);
    return removed;
  }

  /** Both the old and new slug are dropped so a rename cannot leave a stale detail page. */
  private async invalidate(...slugs: string[]): Promise<void> {
    await this.cache.invalidateTag(PRODUCT_CACHE_TAG);
    for (const slug of new Set(slugs)) {
      await this.cache.forget(`products:slug:v2:${slug}`);
    }
  }
}
