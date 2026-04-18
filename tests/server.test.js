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
              chefNote: 'A test chef note.',
              ingredients_used: [{ item: 'chicken', quantity: '500g' }],
              ingredients_missing: [{ item: 'rice', quantity: '200g' }],
              steps: [
                { instruction: 'Step 1', temp: null, duration: null },
                { instruction: 'Step 2', temp: 'medium (160°C / 320°F)', duration: '5 min' }
              ]
            },
            {
              name: 'Test Recipe 2',
              cookTime: '20 minutes',
              servings: 2,
              chefNote: 'Another test note.',
              ingredients_used: [{ item: 'chicken', quantity: '400g' }],
              ingredients_missing: [],
              steps: [
                { instruction: 'Step 1', temp: null, duration: null }
              ]
            },
            {
              name: 'Test Recipe 3',
              cookTime: '45 minutes',
              servings: 2,
              chefNote: 'Third test note.',
              ingredients_used: [{ item: 'chicken', quantity: '600g' }],
              ingredients_missing: [{ item: 'garlic', quantity: '3 cloves' }],
              steps: [
                { instruction: 'Step 1', temp: null, duration: null },
                { instruction: 'Step 2', temp: null, duration: '10 min' },
                { instruction: 'Step 3', temp: 'high (220°C / 425°F)', duration: null }
              ]
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

  test('POST /api/recipes accepts valid styles array', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .send({ ingredients: 'pasta, tomato', servings: 2, styles: ['healthier', 'spicier'] });
    expect([200, 500]).toContain(res.status);
  });

  test('POST /api/recipes rejects invalid style in styles array', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .send({ ingredients: 'pasta, tomato', servings: 2, styles: ['random-invalid'] });
    expect(res.status).toBe(400);
  });

  test('POST /api/recipes rejects styles that is not an array', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .send({ ingredients: 'pasta, tomato', servings: 2, styles: 'healthier' });
    expect(res.status).toBe(400);
  });

  test('POST /api/recipes accepts valid cuisine param', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .send({ ingredients: 'pasta, tomato', servings: 2, cuisine: 'italian' });
    expect([200, 500]).toContain(res.status);
  });

  test('POST /api/recipes rejects invalid cuisine value', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .send({ ingredients: 'pasta, tomato', servings: 2, cuisine: 'klingon' });
    expect(res.status).toBe(400);
  });

  test('POST /api/recipes rejects avoid over 200 chars', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .send({ ingredients: 'pasta', servings: 2, avoid: 'x'.repeat(201) });
    expect(res.status).toBe(400);
  });
});
