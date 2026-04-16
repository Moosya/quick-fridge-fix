# 🍳 Quick Fridge Fix

Type in whatever ingredients you have, pick how many people you're feeding, and get three easy dinner recipes instantly — with cooking time, step-by-step instructions, and a shopping list for anything missing. No login, no account, no fuss.

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and add your OpenAI API key

# 3. Start the server
npm start
# → http://localhost:3000

# Development (auto-reload)
npm run dev

# Run tests
npm test
```

## Stack

- **Frontend:** Vanilla HTML/CSS/JS — no framework, loads fast on mobile
- **Backend:** Node.js + Express
- **AI:** OpenAI GPT-4o-mini (cheap, fast, reliable JSON output)
- **No database, no login, no sessions**

## Deployment

Any Node.js host works: Railway, Render, Fly.io, VPS. Set `OPENAI_API_KEY` and `PORT` as environment variables.
