import { Product } from '../../entities/Product';
import type {
  ProductPage,
  ProductQuery,
  ProductRepository,
  ProductSort,
} from '../../ports/productRepository';
import type { DataSource, Repository, SelectQueryBuilder } from 'typeorm';

const ORDER_BY: Record<ProductSort, [string, 'ASC' | 'DESC'][]> = {
  // id is a deterministic tiebreak: without it two rows sharing a createdAt can
  // swap places between page 1 and page 2 and an item is shown twice or skipped.
  newest: [
    ['p.createdAt', 'DESC'],
    ['p.id', 'DESC'],
  ],
  price_asc: [
    ['p.priceCents', 'ASC'],
    ['p.id', 'ASC'],
  ],
  price_desc: [
    ['p.priceCents', 'DESC'],
    ['p.id', 'DESC'],
  ],
  name_asc: [
    ['p.name', 'ASC'],
    ['p.id', 'ASC'],
  ],
};

export class TypeOrmProductRepository implements ProductRepository {
  private readonly repo: Repository<Product>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Product);
  }

  private applyFilters(qb: SelectQueryBuilder<Product>, query: ProductQuery): void {
    if (query.q) {
      // Parameterised on both sides: the term never reaches the SQL string.
      qb.andWhere('(p.name ILIKE :term OR p.shortDescription ILIKE :term)', {
        term: `%${query.q}%`,
      });
    }
    if (query.minPriceCents !== undefined) {
      qb.andWhere('p.priceCents >= :minPrice', { minPrice: query.minPriceCents });
    }
    if (query.maxPriceCents !== undefined) {
      qb.andWhere('p.priceCents <= :maxPrice', { maxPrice: query.maxPriceCents });
    }
  }

  async search(query: ProductQuery): Promise<ProductPage> {
    const qb = this.repo.createQueryBuilder('p');
    this.applyFilters(qb, query);
    for (const [column, direction] of ORDER_BY[query.sort]) {
      qb.addOrderBy(column, direction);
    }
    // One round-trip for the window and one for the count. Product has no
    // relations, so there is nothing to join and nothing to lazy-load per row.
    const [items, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      pages: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  findBySlug(slug: string): Promise<Product | null> {
    return this.repo.findOne({ where: { slug } });
  }

  findById(id: string): Promise<Product | null> {
    return this.repo.findOne({ where: { id } });
  }

  create(input: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    return this.repo.save(this.repo.create(input));
  }

  async update(id: string, patch: Partial<Product>): Promise<Product | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    this.repo.merge(existing, patch);
    return this.repo.save(existing);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.repo.delete({ id });
    return (result.affected ?? 0) > 0;
  }
}
