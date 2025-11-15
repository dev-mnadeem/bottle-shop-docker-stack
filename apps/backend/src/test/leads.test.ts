import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createHarness, tokenFor } from './helpers';

const LEAD = {
  name: 'Jane Doe',
  email: 'jane@acme-supplies.com',
  message: 'We would like a quote for 500 units of the 1L steel bottle for our offices.',
};

describe('POST /api/leads', () => {
  it('captures a lead and returns the triage verdict', async () => {
    const { app } = createHarness();
    const res = await request(app).post('/api/leads').send(LEAD).expect(201);

    expect(res.body.intent).toBe('bulk_order');
    expect(res.body.priority).toBe('high');
  });

  it('is idempotent on email and writes only one row', async () => {
    const harness = createHarness();
    const first = await request(harness.app).post('/api/leads').send(LEAD).expect(201);
    const second = await request(harness.app).post('/api/leads').send(LEAD).expect(200);

    expect(second.body.id).toBe(first.body.id);
    expect(harness.leads.rows).toHaveLength(1);
  });

  it('accepts the exact payload the browser form sends', async () => {
    const { app } = createHarness();
    await request(app)
      .post('/api/leads')
      .send({ name: 'Al', email: 'al@example.com', message: 'Interested in the carafe.' })
      .expect(201);
  });

  it('rejects a malformed email', async () => {
    const { app } = createHarness();
    const res = await request(app)
      .post('/api/leads')
      .send({ ...LEAD, email: 'not-an-email' })
      .expect(400);
    expect(res.body.error).toBe('ValidationError');
  });

  it('rejects an empty message', async () => {
    const { app } = createHarness();
    await request(app)
      .post('/api/leads')
      .send({ ...LEAD, message: '   ' })
      .expect(400);
  });

  it('returns 429 with Retry-After once the per-minute budget is spent', async () => {
    const { app } = createHarness();
    for (let i = 0; i < 5; i += 1) {
      await request(app)
        .post('/api/leads')
        .send({ ...LEAD, email: `person${i}@example.com` })
        .expect(201);
    }

    const blocked = await request(app)
      .post('/api/leads')
      .send({ ...LEAD, email: 'person6@example.com' })
      .expect(429);

    expect(blocked.body.error).toBe('TooManyRequests');
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
  });
});

describe('GET /api/leads', () => {
  it('is not readable anonymously', async () => {
    const { app } = createHarness();
    await request(app).get('/api/leads').expect(401);
  });

  it('is not readable by a plain user', async () => {
    const harness = createHarness();
    const token = await tokenFor(harness, 'user@example.com', 'user');
    await request(harness.app)
      .get('/api/leads')
      .set('authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('lists captured leads for an admin', async () => {
    const harness = createHarness();
    await request(harness.app).post('/api/leads').send(LEAD).expect(201);

    const token = await tokenFor(harness, 'admin@example.com', 'admin');
    const res = await request(harness.app)
      .get('/api/leads')
      .set('authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.total).toBe(1);
    expect(res.body.items[0].email).toBe(LEAD.email);
  });
});
