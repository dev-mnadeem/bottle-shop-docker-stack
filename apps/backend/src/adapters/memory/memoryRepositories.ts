import { randomUUID } from 'node:crypto';
import type { Lead } from '../../entities/Lead';
import type { Product } from '../../entities/Product';
import type { User } from '../../entities/User';
import type { LeadRepository, NewLead } from '../../ports/leadRepository';
import type { ProductPage, ProductQuery, ProductRepository } from '../../ports/productRepository';
import type { UserRepository } from '../../ports/userRepository';

/**
 * In-memory implementations of the three repository ports. They exist so the HTTP
 * layer can be exercised end to end in tests without a database container, and so
 * the filter/sort/pagination contract is pinned by the same test that the Postgres
 * adapter has to satisfy.
 */
export class MemoryProductRepository implements ProductRepository {
  private readonly rows = new Map<string, Product>();

  constructor(seed: Partial<Product>[] = []) {
    for (const row of seed) this.seedOne(row);
  }

  private seedOne(row: Partial<Product>): Product {
    const now = row.createdAt ?? new Date();
    const product: Product = {
      id: row.id ?? randomUUID(),
      slug: row.slug ?? randomUUID(),
      name: row.name ?? 'Unnamed',
      priceCents: row.priceCents ?? 0,
      imageUrl: row.imageUrl ?? '',
      shortDescription: row.shortDescription ?? '',
      createdAt: now,
      updatedAt: row.updatedAt ?? now,
    };
    this.rows.set(product.id, product);
    return product;
  }

  search(query: ProductQuery): Promise<ProductPage> {
    let items = [...this.rows.values()];

    if (query.q) {
      const term = query.q.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(term) || p.shortDescription.toLowerCase().includes(term),
      );
    }
    if (query.minPriceCents !== undefined) {
      items = items.filter((p) => p.priceCents >= query.minPriceCents!);
    }
    if (query.maxPriceCents !== undefined) {
      items = items.filter((p) => p.priceCents <= query.maxPriceCents!);
    }

    const byId = (a: Product, b: Product, dir: number) =>
      a.id < b.id ? -dir : a.id > b.id ? dir : 0;
    items.sort((a, b) => {
      switch (query.sort) {
        case 'price_asc':
          return a.priceCents - b.priceCents || byId(a, b, 1);
        case 'price_desc':
          return b.priceCents - a.priceCents || byId(a, b, -1);
        case 'name_asc':
          return a.name.localeCompare(b.name) || byId(a, b, 1);
        case 'newest':
        default:
          return b.createdAt.getTime() - a.createdAt.getTime() || byId(a, b, -1);
      }
    });

    const total = items.length;
    const start = (query.page - 1) * query.limit;
    return Promise.resolve({
      items: items.slice(start, start + query.limit),
      total,
      page: query.page,
      limit: query.limit,
      pages: Math.max(1, Math.ceil(total / query.limit)),
    });
  }

  findBySlug(slug: string): Promise<Product | null> {
    return Promise.resolve([...this.rows.values()].find((p) => p.slug === slug) ?? null);
  }

  findById(id: string): Promise<Product | null> {
    return Promise.resolve(this.rows.get(id) ?? null);
  }

  create(input: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    return Promise.resolve(this.seedOne({ ...input }));
  }

  async update(id: string, patch: Partial<Product>): Promise<Product | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const updated: Product = { ...existing, ...patch, id: existing.id, updatedAt: new Date() };
    this.rows.set(id, updated);
    return updated;
  }

  remove(id: string): Promise<boolean> {
    return Promise.resolve(this.rows.delete(id));
  }
}

export class MemoryLeadRepository implements LeadRepository {
  readonly rows: Lead[] = [];

  findByEmail(email: string): Promise<Lead | null> {
    return Promise.resolve(this.rows.find((l) => l.email === email) ?? null);
  }

  create(input: NewLead): Promise<Lead> {
    const lead: Lead = {
      id: randomUUID(),
      email: input.email,
      name: input.name,
      message: input.message,
      utmSource: input.utmSource ?? null,
      intent: input.intent ?? 'general',
      priority: input.priority ?? 'normal',
      triageSource: 'rules',
      createdAt: new Date(),
    };
    this.rows.push(lead);
    return Promise.resolve(lead);
  }

  list(limit: number, offset: number): Promise<{ items: Lead[]; total: number }> {
    const sorted = [...this.rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return Promise.resolve({ items: sorted.slice(offset, offset + limit), total: sorted.length });
  }
}

export class MemoryUserRepository implements UserRepository {
  private readonly rows = new Map<string, User>();

  findByEmail(email: string): Promise<User | null> {
    return Promise.resolve([...this.rows.values()].find((u) => u.email === email) ?? null);
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.rows.get(id) ?? null);
  }

  create(input: Pick<User, 'email' | 'passwordHash'> & Partial<Pick<User, 'role'>>): Promise<User> {
    const now = new Date();
    const user: User = {
      id: randomUUID(),
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role ?? 'user',
      createdAt: now,
      updatedAt: now,
    };
    this.rows.set(user.id, user);
    return Promise.resolve(user);
  }
}
