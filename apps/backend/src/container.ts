import { MemoryCacheStore } from './adapters/cache/memoryCacheStore';
import { RedisCacheStore } from './adapters/cache/redisCacheStore';
import { TypeOrmLeadRepository } from './adapters/db/typeormLeadRepository';
import { TypeOrmProductRepository } from './adapters/db/typeormProductRepository';
import { TypeOrmUserRepository } from './adapters/db/typeormUserRepository';
import { LlmLeadTriage } from './adapters/triage/llmLeadTriage';
import { RuleLeadTriage } from './adapters/triage/ruleLeadTriage';
import { env } from './config/env';
import { logger } from './logger';
import { AuthService } from './services/authService';
import { CacheService } from './services/cacheService';
import { LeadService } from './services/leadService';
import { ProductService } from './services/productService';
import { RateLimiter } from './services/rateLimiter';
import type { CacheStore } from './ports/cacheStore';
import type { LeadRepository } from './ports/leadRepository';
import type { LeadTriageProvider } from './ports/leadTriage';
import type { ProductRepository } from './ports/productRepository';
import type { UserRepository } from './ports/userRepository';
import type { DataSource } from 'typeorm';

/** Everything the HTTP layer is allowed to reach. */
export interface Container {
  store: CacheStore;
  products: ProductService;
  leads: LeadService;
  auth: AuthService;
  limiter: RateLimiter;
  triage: LeadTriageProvider;
  /** Liveness probe for the datastore, or null when the app runs without one. */
  checkDatabase: () => Promise<boolean>;
}

export function selectCacheStore(): CacheStore {
  if (!env.REDIS_URL) {
    logger.warn('REDIS_URL not set — using an in-process cache. Do not run more than one replica.');
    return new MemoryCacheStore();
  }
  return RedisCacheStore.fromUrl(env.REDIS_URL);
}

export function selectTriageProvider(): LeadTriageProvider {
  const rules = new RuleLeadTriage();
  if (env.LEAD_TRIAGE_PROVIDER !== 'llm') return rules;
  if (!env.LEAD_TRIAGE_API_KEY) {
    logger.warn('LEAD_TRIAGE_PROVIDER=llm but LEAD_TRIAGE_API_KEY is unset — staying on rules.');
    return rules;
  }
  return new LlmLeadTriage(rules, {
    apiKey: env.LEAD_TRIAGE_API_KEY,
    apiUrl: env.LEAD_TRIAGE_API_URL,
    model: env.LEAD_TRIAGE_MODEL,
  });
}

/** Assembles the container from explicit parts — used directly by the tests. */
export function buildContainer(parts: {
  productRepo: ProductRepository;
  leadRepo: LeadRepository;
  userRepo: UserRepository;
  store: CacheStore;
  triage: LeadTriageProvider;
  checkDatabase?: () => Promise<boolean>;
}): Container {
  const cache = new CacheService(parts.store);
  return {
    store: parts.store,
    products: new ProductService(parts.productRepo, cache),
    leads: new LeadService(parts.leadRepo, parts.triage),
    auth: new AuthService(parts.userRepo, parts.store),
    limiter: new RateLimiter(parts.store),
    triage: parts.triage,
    checkDatabase: parts.checkDatabase ?? (() => Promise.resolve(true)),
  };
}

/** Production wiring: Postgres repositories plus whichever store is configured. */
export function buildProductionContainer(dataSource: DataSource): Container {
  return buildContainer({
    productRepo: new TypeOrmProductRepository(dataSource),
    leadRepo: new TypeOrmLeadRepository(dataSource),
    userRepo: new TypeOrmUserRepository(dataSource),
    store: selectCacheStore(),
    triage: selectTriageProvider(),
    checkDatabase: async () => {
      try {
        await dataSource.query('SELECT 1');
        return true;
      } catch {
        return false;
      }
    },
  });
}
