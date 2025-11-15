import type { User } from '../entities/User';

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(input: Pick<User, 'email' | 'passwordHash'> & Partial<Pick<User, 'role'>>): Promise<User>;
}
