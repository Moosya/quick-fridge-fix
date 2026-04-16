const express = require('express');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai');
require('dotenv').config();
const { buildPrompt } = require('./prompt');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting: 10 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Too many requests, please try again later.' },
});

app.use(limiter);
app.use(express.json());
app.use(express.static('public'));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// POST /api/recipes endpoint
app.post('/api/recipes', async (req, res) => {
  const { ingredients, servings } = req.body;

  // Input validation
  if (!ingredients || typeof ingredients !== 'string') {
    return res.status(400).json({ error: 'Ingredients string is required.' });
  }

  if (ingredients.length > 500) {
    return res.status(400).json({ error: 'Ingredients cannot exceed 500 characters.' });
  }

  if (!servings || typeof servings !== 'number') {
    return res.status(400).json({ error: 'Servings must be a number.' });
  }

  const servingsNum = Math.floor(servings); // ensure integer
  if (servingsNum < 1 || servingsNum > 20) {
    return res.status(400).json({ error: 'Servings must be between 1 and 20.' });
  }

  try {
    const messages = buildPrompt(ingredients, servingsNum);

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
    console.error('OpenAI Error:', error.message);
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
