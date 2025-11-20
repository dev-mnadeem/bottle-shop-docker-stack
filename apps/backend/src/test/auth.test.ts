import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createHarness } from './helpers';

const CREDENTIALS = { email: 'person@example.com', password: 'Passw0rd!' };

describe('auth', () => {
  it('registers, logs in and identifies the caller', async () => {
    const { app } = createHarness();

    const registered = await request(app).post('/api/auth/register').send(CREDENTIALS).expect(201);
    expect(registered.body.role).toBe('user');

    const login = await request(app).post('/api/auth/login').send(CREDENTIALS).expect(200);
    expect(typeof login.body.token).toBe('string');

    const me = await request(app)
      .get('/api/auth/me')
      .set('authorization', `Bearer ${login.body.token}`)
      .expect(200);
    expect(me.body.email).toBe(CREDENTIALS.email);
  });

  it('refuses a second registration for the same email', async () => {
    const { app } = createHarness();
    await request(app).post('/api/auth/register').send(CREDENTIALS).expect(201);
    const res = await request(app).post('/api/auth/register').send(CREDENTIALS).expect(409);
    expect(res.body.error).toBe('Conflict');
  });

  it('gives the same answer for a wrong password and an unknown account', async () => {
    const { app } = createHarness();
    await request(app).post('/api/auth/register').send(CREDENTIALS).expect(201);

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ ...CREDENTIALS, password: 'WrongPassw0rd!' })
      .expect(401);
    const unknownUser = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'Passw0rd!' })
      .expect(401);

    expect(wrongPassword.body.message).toBe(unknownUser.body.message);
  });

  it('rejects a password shorter than eight characters', async () => {
    const { app } = createHarness();
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'short@example.com', password: 'abc' })
      .expect(400);
  });

  it('rejects a tampered token', async () => {
    const { app } = createHarness();
    await request(app).post('/api/auth/register').send(CREDENTIALS).expect(201);
    const { body } = await request(app).post('/api/auth/login').send(CREDENTIALS).expect(200);

    const token = body.token as string;
    const tampered = `${token.slice(0, -2)}xx`;
    await request(app).get('/api/auth/me').set('authorization', `Bearer ${tampered}`).expect(401);
  });

  it('rejects a missing Authorization header', async () => {
    const { app } = createHarness();
    await request(app).get('/api/auth/me').expect(401);
  });

  it('stops accepting a token after logout', async () => {
    const { app } = createHarness();
    await request(app).post('/api/auth/register').send(CREDENTIALS).expect(201);
    const { body } = await request(app).post('/api/auth/login').send(CREDENTIALS).expect(200);
    const auth = `Bearer ${body.token}`;

    await request(app).get('/api/auth/me').set('authorization', auth).expect(200);
    await request(app).post('/api/auth/logout').set('authorization', auth).expect(204);
    await request(app).get('/api/auth/me').set('authorization', auth).expect(401);
  });
});
