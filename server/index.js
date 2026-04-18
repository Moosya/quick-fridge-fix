const express = require('express');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai');
const path = require('path');
const session = require('express-session');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { buildPrompt } = require('./prompt');
const authRouter = require('./auth');
const { saveRecipe, getSavedRecipes } = require('./db');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 10,
  message: { error: 'Too many requests, please try again later.' },
});

app.use(limiter);
app.use(session({
  secret: process.env.SESSION_SECRET || 'qff-dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));
app.use(express.json());
app.use(authRouter);

app.post('/api/recipes/save', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Authentication required' });
  const { name, cook_time, servings, ingredients_used, ingredients_missing, steps } = req.body;
  if (!name) return res.status(400).json({ error: 'Recipe name required' });
  const saved = saveRecipe(req.session.userId, {
    name, cook_time, servings,
    ingredients_used: JSON.stringify(ingredients_used || []),
    ingredients_missing: JSON.stringify(ingredients_missing || []),
    steps: JSON.stringify(steps || [])
  });
  res.json({ saved: true, id: saved.id });
});

app.get('/api/recipes/saved', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Authentication required' });
  const recipes = getSavedRecipes(req.session.userId).map(r => ({
    ...r,
    ingredients_used: JSON.parse(r.ingredients_used || '[]'),
    ingredients_missing: JSON.parse(r.ingredients_missing || '[]'),
    steps: JSON.parse(r.steps || '[]')
  }));
  res.json({ recipes });
});

app.get('/cookbook', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/cookbook.html'));
});

app.use(express.static('public'));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const { STYLE_MAP, CUISINE_MAP } = require('./prompt');

app.post('/api/recipes', async (req, res) => {
  const { ingredients, servings, styles, cuisine, avoid } = req.body;

  if (!ingredients || typeof ingredients !== 'string') {
    return res.status(400).json({ error: 'Ingredients string is required.' });
  }

  if (ingredients.length > 500) {
    return res.status(400).json({ error: 'Ingredients cannot exceed 500 characters.' });
  }

  if (!servings || typeof servings !== 'number') {
    return res.status(400).json({ error: 'Servings must be a number.' });
  }

  const servingsNum = Math.floor(servings);
  if (servingsNum < 1 || servingsNum > 20) {
    return res.status(400).json({ error: 'Servings must be between 1 and 20.' });
  }

  // Validate styles array
  const validStyles = Object.keys(STYLE_MAP);
  if (styles !== undefined) {
    if (!Array.isArray(styles)) {
      return res.status(400).json({ error: 'styles must be an array.' });
    }
    const invalid = styles.filter(s => !validStyles.includes(s));
    if (invalid.length > 0) {
      return res.status(400).json({ error: `Invalid style(s): ${invalid.join(', ')}. Must be one of: ${validStyles.join(', ')}` });
    }
  }

  // Validate cuisine parameter
  const validCuisines = Object.keys(CUISINE_MAP);
  if (cuisine !== undefined && cuisine !== null && !validCuisines.includes(cuisine)) {
    return res.status(400).json({ error: `Invalid cuisine. Must be one of: ${validCuisines.join(', ')}` });
  }

  // Validate avoid parameter length
  if (avoid !== undefined && typeof avoid === 'string' && avoid.length > 200) {
    return res.status(400).json({ error: 'Avoid ingredients cannot exceed 200 characters.' });
  }

  try {
    const messages = buildPrompt(ingredients, servingsNum, { styles: styles || [], cuisine, avoid });

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: messages,
      response_format: { type: 'json_object' },
    });

    let recipeData;
    try {
      recipeData = JSON.parse(completion.choices[0].message.content);
    } catch (parseError) {
      return res.status(500).json({ error: 'Failed to parse AI response.' });
    }

    if (!recipeData || !Array.isArray(recipeData.recipes)) {
      return res.status(500).json({ error: 'Invalid recipe structure returned by AI.' });
    }

    res.json(recipeData);

  } catch (error) {
    console.error('LM Studio Error:', error.message);
    const isRateLimit = error.status === 429
      || error.code === 'rate_limit_exceeded'
      || (error.message && error.message.toLowerCase().includes('rate limit'));
    if (isRateLimit) {
      return res.status(429).json({ error: 'AI service is busy, please try again in a moment.' });
    }
    res.status(500).json({ error: 'Failed to generate recipes. Please try again.' });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Quick Fridge Fix running on http://localhost:${PORT}`);
  });
}

module.exports = app;
