import { Lead } from '../../entities/Lead';
import type { LeadRepository, NewLead } from '../../ports/leadRepository';
import type { DataSource, Repository } from 'typeorm';

export class TypeOrmLeadRepository implements LeadRepository {
  private readonly repo: Repository<Lead>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Lead);
  }

  findByEmail(email: string): Promise<Lead | null> {
    return this.repo.findOne({ where: { email } });
  }

  create(input: NewLead): Promise<Lead> {
    return this.repo.save(this.repo.create(input));
  }

  async list(limit: number, offset: number): Promise<{ items: Lead[]; total: number }> {
    const [items, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: offset,
      take: limit,
    });
    return { items, total };
  }
}
