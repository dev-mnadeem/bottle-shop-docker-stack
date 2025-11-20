import bcrypt from 'bcryptjs';
import { MemoryCacheStore } from '../adapters/cache/memoryCacheStore';
import {
  MemoryLeadRepository,
  MemoryProductRepository,
  MemoryUserRepository,
} from '../adapters/memory/memoryRepositories';
import { RuleLeadTriage } from '../adapters/triage/ruleLeadTriage';
import { buildContainer, type Container } from '../container';
import { buildExpressApp } from '../server';
import type { Product } from '../entities/Product';
import type { Application } from 'express';

const BASE_TIME = Date.UTC(2024, 0, 1);

/** Twelve products with predictable prices, names and creation order. */
export function sampleProducts(): Partial<Product>[] {
  return Array.from({ length: 12 }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    slug: `bottle-${i}`,
    name: i % 2 === 0 ? `Glass Bottle ${i}` : `Steel Bottle ${i}`,
    priceCents: 1000 + i * 100,
    imageUrl: 'samples/ecommerce/shoes',
    shortDescription: i % 3 === 0 ? 'Insulated for cold drinks.' : 'Everyday carry bottle.',
    createdAt: new Date(BASE_TIME + i * 60_000),
    updatedAt: new Date(BASE_TIME + i * 60_000),
  }));
}

export interface Harness {
  app: Application;
  container: Container;
  users: MemoryUserRepository;
  leads: MemoryLeadRepository;
  products: MemoryProductRepository;
}

export function createHarness(overrides: { products?: Partial<Product>[] } = {}): Harness {
  const products = new MemoryProductRepository(overrides.products ?? sampleProducts());
  const leads = new MemoryLeadRepository();
  const users = new MemoryUserRepository();

  const container = buildContainer({
    productRepo: products,
    leadRepo: leads,
    userRepo: users,
    store: new MemoryCacheStore(),
    triage: new RuleLeadTriage(),
  });

  return { app: buildExpressApp(container), container, users, leads, products };
}

/** Creates a user directly in the repository and returns a signed access token. */
export async function tokenFor(
  harness: Harness,
  email: string,
  role: 'admin' | 'user',
): Promise<string> {
  const password = 'Passw0rd!';
  await harness.users.create({ email, passwordHash: await bcrypt.hash(password, 4), role });
  const { token } = await harness.container.auth.login(email, password);
  return token;
}
