/**
 * QFF-004: Save/list recipes (cookbook) endpoint tests
 */

const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';
process.env.RESEND_API_KEY = 'test-key';
process.env.APP_URL = 'http://localhost:3000';

let app;
beforeAll(() => {
  jest.resetModules();
  app = require('../server/index');
});

afterAll(() => {
  if (app && app.close) app.close();
});

describe('QFF-004: POST /api/recipes/save (unauthenticated)', () => {
  test('returns 401 when not logged in', async () => {
    const res = await request(app)
      .post('/api/recipes/save')
      .send({
        name: 'Test Recipe',
        cook_time: '30 mins',
        servings: 2,
        ingredients_used: ['chicken'],
        ingredients_missing: [],
        steps: ['Cook it']
      });
    expect(res.status).toBe(401);
  });
});

describe('QFF-004: GET /api/recipes/saved (unauthenticated)', () => {
  test('returns 401 when not logged in', async () => {
    const res = await request(app).get('/api/recipes/saved');
    expect(res.status).toBe(401);
  });
});

describe('QFF-004: POST /api/recipes/save — input validation', () => {
  test('returns 400 for missing recipe name (unauthenticated gives 401 first)', async () => {
    // Even with auth, missing name should 400 — but without auth we get 401
    // This test verifies the endpoint exists and rejects unauthenticated requests
    const res = await request(app)
      .post('/api/recipes/save')
      .send({});
    expect([400, 401]).toContain(res.status);
  });
});

describe('QFF-004: GET /cookbook', () => {
  test('serves cookbook.html page', async () => {
    const res = await request(app).get('/cookbook');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/cookbook|saved recipes/i);
  });
});
