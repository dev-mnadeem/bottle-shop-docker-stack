import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createHarness, sampleProducts, tokenFor } from './helpers';

describe('GET /api/products', () => {
  it('returns the default page size and a total', async () => {
    const { app } = createHarness();
    const res = await request(app).get('/api/products').expect(200);

    expect(res.body.items).toHaveLength(12);
    expect(res.body.total).toBe(12);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(12);
    expect(res.body.pages).toBe(1);
  });

  it('paginates without repeating or skipping an item', async () => {
    const { app } = createHarness();
    const first = await request(app).get('/api/products?page=1&limit=5').expect(200);
    const second = await request(app).get('/api/products?page=2&limit=5').expect(200);
    const third = await request(app).get('/api/products?page=3&limit=5').expect(200);

    const ids = [...first.body.items, ...second.body.items, ...third.body.items].map(
      (p: { id: string }) => p.id,
    );
    expect(ids).toHaveLength(12);
    expect(new Set(ids).size).toBe(12);
  });

  it('caps limit at 100 instead of letting a client scan the table', async () => {
    const { app } = createHarness();
    const res = await request(app).get('/api/products?limit=100000').expect(400);
    expect(res.body.error).toBe('ValidationError');
  });

  it('rejects a non-numeric page rather than producing OFFSET NaN', async () => {
    const { app } = createHarness();
    const res = await request(app).get('/api/products?page=abc').expect(400);
    expect(res.body.error).toBe('ValidationError');
  });

  it('filters by free-text search across name and description', async () => {
    const { app } = createHarness();
    const res = await request(app).get('/api/products?q=Steel').expect(200);

    expect(res.body.items.length).toBeGreaterThan(0);
    for (const item of res.body.items) {
      expect(`${item.name} ${item.shortDescription}`.toLowerCase()).toContain('steel');
    }
  });

  it('filters by price range', async () => {
    const { app } = createHarness();
    const res = await request(app)
      .get('/api/products?minPriceCents=1300&maxPriceCents=1600')
      .expect(200);

    expect(res.body.items.length).toBeGreaterThan(0);
    for (const item of res.body.items) {
      expect(item.priceCents).toBeGreaterThanOrEqual(1300);
      expect(item.priceCents).toBeLessThanOrEqual(1600);
    }
  });

  it('sorts by price ascending and descending', async () => {
    const { app } = createHarness();
    const asc = await request(app).get('/api/products?sort=price_asc').expect(200);
    const desc = await request(app).get('/api/products?sort=price_desc').expect(200);

    const ascPrices: number[] = asc.body.items.map((p: { priceCents: number }) => p.priceCents);
    expect(ascPrices).toEqual([...ascPrices].sort((a, b) => a - b));
    expect(desc.body.items[0].priceCents).toBe(ascPrices[ascPrices.length - 1]);
  });

  it('rejects an unknown sort key', async () => {
    const { app } = createHarness();
    await request(app).get('/api/products?sort=random').expect(400);
  });

  it('reports a cache MISS then a HIT for the same page', async () => {
    const { app } = createHarness();
    const first = await request(app).get('/api/products').expect(200);
    const second = await request(app).get('/api/products').expect(200);

    expect(first.headers['server-timing']).toContain('cache;desc="MISS"');
    expect(second.headers['server-timing']).toContain('cache;desc="HIT"');
  });

  it('does not cache a filtered query', async () => {
    const { app } = createHarness();
    await request(app).get('/api/products?q=Steel').expect(200);
    const second = await request(app).get('/api/products?q=Steel').expect(200);

    expect(second.headers['server-timing']).toContain('cache;desc="MISS"');
  });

  it('answers 304 when the client already holds the ETag', async () => {
    const { app } = createHarness();
    const first = await request(app).get('/api/products').expect(200);
    const etag = String(first.headers.etag);
    expect(etag).toBeTruthy();

    await request(app).get('/api/products').set('If-None-Match', etag).expect(304);
  });
});

describe('GET /api/products/:slug', () => {
  it('returns one product', async () => {
    const { app } = createHarness();
    const res = await request(app).get('/api/products/bottle-3').expect(200);
    expect(res.body.slug).toBe('bottle-3');
  });

  it('returns 404 for an unknown slug', async () => {
    const { app } = createHarness();
    const res = await request(app).get('/api/products/no-such-bottle').expect(404);
    expect(res.body.error).toBe('NotFound');
  });

  it('rejects a slug that is not kebab-case', async () => {
    const { app } = createHarness();
    await request(app).get('/api/products/Not_A_Slug').expect(400);
  });
});

describe('catalogue writes', () => {
  const body = {
    slug: 'new-bottle',
    name: 'New Bottle',
    priceCents: 1234,
    imageUrl: 'samples/ecommerce/shoes',
    shortDescription: 'A new bottle.',
  };

  it('rejects an anonymous create with 401', async () => {
    const { app } = createHarness();
    await request(app).post('/api/products').send(body).expect(401);
  });

  it('rejects a create from a non-admin with 403', async () => {
    const harness = createHarness();
    const token = await tokenFor(harness, 'user@example.com', 'user');
    const res = await request(harness.app)
      .post('/api/products')
      .set('authorization', `Bearer ${token}`)
      .send(body)
      .expect(403);
    expect(res.body.error).toBe('Forbidden');
  });

  it('allows an admin to create and invalidates the cached list', async () => {
    const harness = createHarness({ products: sampleProducts() });
    const token = await tokenFor(harness, 'admin@example.com', 'admin');

    await request(harness.app).get('/api/products').expect(200);
    await request(harness.app)
      .post('/api/products')
      .set('authorization', `Bearer ${token}`)
      .send(body)
      .expect(201);

    const after = await request(harness.app).get('/api/products').expect(200);
    expect(after.headers['server-timing']).toContain('cache;desc="MISS"');
    expect(after.body.total).toBe(13);
  });

  it('drops the old detail cache entry when a slug is renamed', async () => {
    const harness = createHarness();
    const token = await tokenFor(harness, 'admin@example.com', 'admin');

    await request(harness.app).get('/api/products/bottle-0').expect(200);
    const target = await harness.products.findBySlug('bottle-0');

    await request(harness.app)
      .put(`/api/products/${target!.id}`)
      .set('authorization', `Bearer ${token}`)
      .send({ slug: 'renamed-bottle' })
      .expect(200);

    await request(harness.app).get('/api/products/bottle-0').expect(404);
    await request(harness.app).get('/api/products/renamed-bottle').expect(200);
  });

  it('rejects a negative price', async () => {
    const harness = createHarness();
    const token = await tokenFor(harness, 'admin@example.com', 'admin');
    await request(harness.app)
      .post('/api/products')
      .set('authorization', `Bearer ${token}`)
      .send({ ...body, priceCents: -1 })
      .expect(400);
  });

  it('deletes and then 404s', async () => {
    const harness = createHarness();
    const token = await tokenFor(harness, 'admin@example.com', 'admin');
    const target = await harness.products.findBySlug('bottle-1');

    await request(harness.app)
      .delete(`/api/products/${target!.id}`)
      .set('authorization', `Bearer ${token}`)
      .expect(204);
    await request(harness.app).get('/api/products/bottle-1').expect(404);
  });
});
