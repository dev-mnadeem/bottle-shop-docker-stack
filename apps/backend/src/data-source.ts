import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from './config/env';
import { Lead } from './entities/Lead';
import { Product } from './entities/Product';
import { User } from './entities/User';
import { InitialSchema1706000000000 } from './migrations/1706000000000-InitialSchema';

/**
 * Exactly one export: the TypeORM CLI refuses a data-source file that exports
 * the same instance twice (named plus default).
 *
 * `synchronize` is off everywhere. Schema changes go through the migration list
 * below so that the schema a developer runs is the same one a deploy applies, and
 * so no boot can silently drop a column it does not recognise.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  synchronize: false,
  logging: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  entities: [User, Product, Lead],
  migrations: [InitialSchema1706000000000],
});
