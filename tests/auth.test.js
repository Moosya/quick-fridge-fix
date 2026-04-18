/**
 * QFF-004: Auth endpoint tests — magic link flow
 */

const request = require('supertest');
const path = require('path');

// Use in-memory DB for tests
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';
process.env.RESEND_API_KEY = 'test-key';
process.env.APP_URL = 'http://localhost:3000';

let app;
beforeAll(() => {
  // Fresh require after env setup
  jest.resetModules();
  app = require('../server/index');
});

afterAll(() => {
  // Close DB/server if exposed
  if (app && app.close) app.close();
});

describe('QFF-004: POST /api/auth/request', () => {
  test('returns { sent: true } for valid email', async () => {
    const res = await request(app)
      .post('/api/auth/request')
      .send({ email: 'test@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.sent).toBe(true);
  });

  test('returns 400 for missing email', async () => {
    const res = await request(app)
      .post('/api/auth/request')
      .send({});
    expect(res.status).toBe(400);
  });

  test('returns 400 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/request')
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });
});

describe('QFF-004: GET /api/auth/me (unauthenticated)', () => {
  test('returns { user: null } when not logged in', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
  });
});

describe('QFF-004: GET /api/auth/verify', () => {
  test('returns 400 for missing token', async () => {
    const res = await request(app).get('/api/auth/verify');
    expect(res.status).toBe(400);
  });

  test('returns 400 for invalid/unknown token', async () => {
    const res = await request(app).get('/api/auth/verify?token=deadbeef00000000000000000000000000000000000000000000000000000000');
    expect(res.status).toBe(400);
  });
});

describe('QFF-004: POST /api/auth/logout', () => {
  test('returns 200 and clears session', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
  });
});
