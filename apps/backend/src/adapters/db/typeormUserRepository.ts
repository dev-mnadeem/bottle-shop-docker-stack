import { User } from '../../entities/User';
import type { UserRepository } from '../../ports/userRepository';
import type { DataSource, Repository } from 'typeorm';

export class TypeOrmUserRepository implements UserRepository {
  private readonly repo: Repository<User>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(User);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  create(input: Pick<User, 'email' | 'passwordHash'> & Partial<Pick<User, 'role'>>): Promise<User> {
    return this.repo.save(this.repo.create(input));
  }
}
