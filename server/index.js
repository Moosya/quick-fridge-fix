const express = require('express');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { buildPrompt } = require('./prompt');

const app = express();
const PORT = process.env.PORT || 3000;

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many requests, please try again later.' },
});

app.use(limiter);
app.use(express.json());
app.use(express.static('public'));

const openai = new OpenAI({
  baseURL: process.env.LM_STUDIO_URL || 'http://localhost:1234/v1',
  apiKey: 'lm-studio',
});

const MODEL = process.env.LM_STUDIO_MODEL || 'meta/llama-3.3-70b';

app.post('/api/recipes', async (req, res) => {
  const { ingredients, servings } = req.body;

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

  try {
    const messages = buildPrompt(ingredients, servingsNum);

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: messages,
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
