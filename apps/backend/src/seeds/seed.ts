import 'reflect-metadata';
import bcrypt from 'bcryptjs';
import { BCRYPT_ROUNDS } from '../config/constants';
import { AppDataSource } from '../data-source';
import { Product } from '../entities/Product';
import { User } from '../entities/User';

/**
 * `imageUrl` is a path served by the frontend's own public/ directory. Keeping the
 * sample catalogue self-hosted means a fresh clone renders the same grid offline,
 * with no CDN account and nothing to add to next.config.ts remotePatterns. The
 * column also accepts an absolute https URL for a real catalogue.
 */
const PRODUCTS: readonly Pick<
  Product,
  'slug' | 'name' | 'priceCents' | 'imageUrl' | 'shortDescription'
>[] = [
  {
    slug: 'eco-glass-bottle-500ml',
    name: 'Eco Glass Bottle 500ml',
    priceCents: 1499,
    imageUrl: '/products/glass-500.svg',
    shortDescription: 'Borosilicate glass with a bamboo lid and a silicone sleeve.',
  },
  {
    slug: 'eco-glass-bottle-750ml',
    name: 'Eco Glass Bottle 750ml',
    priceCents: 1799,
    imageUrl: '/products/glass-750.svg',
    shortDescription: 'The 500ml body stretched for a full day at a desk.',
  },
  {
    slug: 'stainless-steel-bottle-500ml',
    name: 'Stainless Steel Bottle 500ml',
    priceCents: 1999,
    imageUrl: '/products/steel-500.svg',
    shortDescription: 'Double-walled 18/8 steel. Cold for 24 hours, hot for 12.',
  },
  {
    slug: 'stainless-steel-bottle-1l',
    name: 'Stainless Steel Bottle 1L',
    priceCents: 2499,
    imageUrl: '/products/steel-1l.svg',
    shortDescription: 'A litre of insulated capacity for long days outdoors.',
  },
  {
    slug: 'bamboo-thermos-450ml',
    name: 'Bamboo Thermos 450ml',
    priceCents: 2299,
    imageUrl: '/products/bamboo-450.svg',
    shortDescription: 'Steel vacuum core wrapped in FSC-certified bamboo.',
  },
  {
    slug: 'travel-mug-350ml',
    name: 'Travel Mug 350ml',
    priceCents: 1299,
    imageUrl: '/products/mug-350.svg',
    shortDescription: 'Leak-proof lid sized for a standard cup holder.',
  },
  {
    slug: 'kids-bottle-300ml',
    name: 'Kids Bottle 300ml',
    priceCents: 999,
    imageUrl: '/products/kids-300.svg',
    shortDescription: 'Light, drop-tested, and dishwasher safe.',
  },
  {
    slug: 'fruit-infuser-bottle',
    name: 'Fruit Infuser Bottle',
    priceCents: 1599,
    imageUrl: '/products/infuser.svg',
    shortDescription: 'Removable basket for citrus, berries and mint.',
  },
  {
    slug: 'collapsible-bottle-600ml',
    name: 'Collapsible Bottle 600ml',
    priceCents: 1399,
    imageUrl: '/products/collapsible.svg',
    shortDescription: 'Folds to a third of its height once empty.',
  },
  {
    slug: 'sport-bottle-800ml',
    name: 'Sport Bottle 800ml',
    priceCents: 1699,
    imageUrl: '/products/sport-800.svg',
    shortDescription: 'Wide mouth for ice and an easy-grip textured body.',
  },
  {
    slug: 'glass-carafe-1l',
    name: 'Glass Carafe 1L',
    priceCents: 1899,
    imageUrl: '/products/carafe-1l.svg',
    shortDescription: 'Table carafe with a cork stopper for home or office.',
  },
  {
    slug: 'thermo-flask-2l',
    name: 'Thermo Flask 2L',
    priceCents: 2999,
    imageUrl: '/products/flask-2l.svg',
    shortDescription: 'Two litres of vacuum insulation for a full expedition day.',
  },
];

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Passw0rd!';

async function main(): Promise<void> {
  await AppDataSource.initialize();

  const products = AppDataSource.getRepository(Product);
  // Upsert on the unique slug, so re-seeding an existing database is a no-op
  // rather than a duplicate-key failure or a pile of duplicate rows.
  await products.upsert([...PRODUCTS], {
    conflictPaths: ['slug'],
    skipUpdateIfNoValuesChanged: true,
  });

  const users = AppDataSource.getRepository(User);
  if (!(await users.findOne({ where: { email: ADMIN_EMAIL } }))) {
    await users.save(
      users.create({
        email: ADMIN_EMAIL,
        passwordHash: await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS),
        role: 'admin',
      }),
    );
  }

  // eslint-disable-next-line no-console -- the seed is a CLI, not a server
  console.log(`Seeded ${PRODUCTS.length} products and ensured admin ${ADMIN_EMAIL}`);
  await AppDataSource.destroy();
}

main().catch(async (err: unknown) => {
  // eslint-disable-next-line no-console -- the seed is a CLI, not a server
  console.error(err);
  await AppDataSource.destroy().catch(() => undefined);
  process.exit(1);
});
