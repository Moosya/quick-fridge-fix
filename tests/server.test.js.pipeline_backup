// Mock openai BEFORE requiring the app
jest.mock('openai', () => {
  const mockCreate = jest.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          recipes: [
            {
              name: 'Test Recipe 1',
              cookTime: '30 minutes',
              servings: 2,
              ingredients_used: ['chicken'],
              ingredients_missing: ['rice'],
              steps: ['Step 1', 'Step 2']
            },
            {
              name: 'Test Recipe 2',
              cookTime: '20 minutes',
              servings: 2,
              ingredients_used: ['chicken'],
              ingredients_missing: [],
              steps: ['Step 1']
            },
            {
              name: 'Test Recipe 3',
              cookTime: '45 minutes',
              servings: 2,
              ingredients_used: ['chicken'],
              ingredients_missing: ['garlic'],
              steps: ['Step 1', 'Step 2', 'Step 3']
            }
          ]
        })
      }
    }]
  });

  return jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } }
  }));
});

const request = require('supertest');
const app = require('../server/index');

describe('POST /api/recipes', () => {
  test('valid body returns 200 with 3 recipes', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .send({ ingredients: 'chicken, rice', servings: 2 });

    expect(res.status).toBe(200);
    expect(res.body.recipes).toBeDefined();
    expect(Array.isArray(res.body.recipes)).toBe(true);
    expect(res.body.recipes.length).toBe(3);
  });

  test('missing ingredients field returns 400', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .send({ servings: 2 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('ingredients over 500 chars returns 400', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .send({ ingredients: 'a'.repeat(501), servings: 2 });

    expect(res.status).toBe(400);
  });

  test('servings=0 returns 400', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .send({ ingredients: 'chicken', servings: 0 });

    expect(res.status).toBe(400);
  });

  test('servings=21 returns 400', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .send({ ingredients: 'chicken', servings: 21 });

    expect(res.status).toBe(400);
  });

  test('servings as string "abc" returns 400', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .send({ ingredients: 'chicken', servings: 'abc' });

    expect(res.status).toBe(400);
  });
});
