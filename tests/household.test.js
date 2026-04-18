/**
 * QFF-006: Household profiles endpoint tests
 */
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';
process.env.RESEND_API_KEY = 'test-key';
process.env.APP_URL = 'http://localhost:3000';

// Mock OpenAI
jest.mock('openai', () => {
  const mockCreate = jest.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          recipes: [
            { name: 'T1', cookTime: '20 min', servings: 2, chefNote: 'Note', ingredients_used: [{ item: 'x', quantity: '1' }], ingredients_missing: [], steps: [{ instruction: 'Do it', temp: null, duration: null }] },
            { name: 'T2', cookTime: '20 min', servings: 2, chefNote: 'Note', ingredients_used: [{ item: 'x', quantity: '1' }], ingredients_missing: [], steps: [{ instruction: 'Do it', temp: null, duration: null }] },
            { name: 'T3', cookTime: '20 min', servings: 2, chefNote: 'Note', ingredients_used: [{ item: 'x', quantity: '1' }], ingredients_missing: [], steps: [{ instruction: 'Do it', temp: null, duration: null }] },
          ]
        })
      }
    }]
  });
  return jest.fn().mockImplementation(() => ({ chat: { completions: { create: mockCreate } } }));
});

const request = require('supertest');
let app;

beforeAll(() => {
  jest.resetModules();
  app = require('../server/index');
});

afterAll(() => {
  if (app && app.close) app.close();
});

// Helper: get auth cookie by capturing token directly from DB
async function getAuthCookie() {
  jest.resetModules();
  const freshApp = require('../server/index');
  const { getDb } = require('../server/db');

  await request(freshApp).post('/api/auth/request').send({ email: `hh-${Date.now()}@example.com` });
  const db = getDb();
  const link = db.prepare('SELECT token FROM magic_links ORDER BY id DESC LIMIT 1').get();
  const res = await request(freshApp).get(`/api/auth/verify?token=${link.token}`);
  return { cookie: res.headers['set-cookie'], freshApp };
}

describe('QFF-006: Household profiles — unauthenticated', () => {
  test('GET /api/household returns 401', async () => {
    const res = await request(app).get('/api/household');
    expect(res.status).toBe(401);
  });

  test('POST /api/household returns 401', async () => {
    const res = await request(app)
      .post('/api/household')
      .send({ name: 'Mia', dietary_flags: ['vegetarian'] });
    expect(res.status).toBe(401);
  });

  test('DELETE /api/household/:id returns 401', async () => {
    const res = await request(app).delete('/api/household/1');
    expect(res.status).toBe(401);
  });
});

describe('QFF-006: Household profiles — authenticated', () => {
  let cookie;
  let authApp;

  beforeAll(async () => {
    const result = await getAuthCookie();
    cookie = result.cookie;
    authApp = result.freshApp;
  });

  test('POST creates profile with name + valid flags → 201', async () => {
    const res = await request(authApp)
      .post('/api/household')
      .set('Cookie', cookie)
      .send({ name: 'Mia', dietary_flags: ['vegetarian', 'nut-free'] });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Mia');
  });

  test('GET returns created profile', async () => {
    const res = await request(authApp)
      .get('/api/household')
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.profiles)).toBe(true);
    expect(res.body.profiles.length).toBeGreaterThan(0);
    const mia = res.body.profiles.find(p => p.name === 'Mia');
    expect(mia).toBeDefined();
  });

  test('POST with empty dietary_flags → 201', async () => {
    const res = await request(authApp)
      .post('/api/household')
      .set('Cookie', cookie)
      .send({ name: 'Dad', dietary_flags: [] });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Dad');
  });

  test('POST missing name → 400', async () => {
    const res = await request(authApp)
      .post('/api/household')
      .set('Cookie', cookie)
      .send({ dietary_flags: ['vegetarian'] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('POST with invalid flag → 400', async () => {
    const res = await request(authApp)
      .post('/api/household')
      .set('Cookie', cookie)
      .send({ name: 'Jake', dietary_flags: ['invalid-diet'] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid/i);
  });

  test('DELETE existing profile → 200 { deleted: true }', async () => {
    const createRes = await request(authApp)
      .post('/api/household')
      .set('Cookie', cookie)
      .send({ name: 'ToDelete', dietary_flags: [] });
    expect(createRes.status).toBe(201);

    const delRes = await request(authApp)
      .delete(`/api/household/${createRes.body.id}`)
      .set('Cookie', cookie);
    expect(delRes.status).toBe(200);
    expect(delRes.body).toEqual({ deleted: true });
  });

  test('DELETE non-existent profile → 404', async () => {
    const res = await request(authApp)
      .delete('/api/household/999999')
      .set('Cookie', cookie);
    expect(res.status).toBe(404);
  });

  test('Deleted profile no longer appears in GET', async () => {
    const createRes = await request(authApp)
      .post('/api/household')
      .set('Cookie', cookie)
      .send({ name: 'Temp', dietary_flags: [] });

    await request(authApp)
      .delete(`/api/household/${createRes.body.id}`)
      .set('Cookie', cookie);

    const listRes = await request(authApp)
      .get('/api/household')
      .set('Cookie', cookie);
    const found = listRes.body.profiles.find(p => p.id === createRes.body.id);
    expect(found).toBeUndefined();
  });

  test('POST /api/recipes with householdProfiles → 200', async () => {
    const res = await request(authApp)
      .post('/api/recipes')
      .set('Cookie', cookie)
      .send({
        ingredients: 'chicken, rice',
        servings: 2,
        householdProfiles: [{ name: 'Mia', dietary_flags: ['vegetarian'] }]
      });
    expect(res.status).toBe(200);
    expect(res.body.recipes).toBeDefined();
  });

  test('POST /api/recipes with invalid householdProfiles flag → 400', async () => {
    const res = await request(authApp)
      .post('/api/recipes')
      .set('Cookie', cookie)
      .send({
        ingredients: 'chicken, rice',
        servings: 2,
        householdProfiles: [{ name: 'Mia', dietary_flags: ['invalid-flag'] }]
      });
    expect(res.status).toBe(400);
  });

  test('POST /api/recipes with householdProfiles not array → 400', async () => {
    const res = await request(authApp)
      .post('/api/recipes')
      .set('Cookie', cookie)
      .send({
        ingredients: 'chicken, rice',
        servings: 2,
        householdProfiles: 'not-an-array'
      });
    expect(res.status).toBe(400);
  });
});
