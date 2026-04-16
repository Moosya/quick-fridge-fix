# TICKET-QFF-001 — Quick Fridge Fix: Full Initial Build

**Status:** Open  
**Assigned:** Quinn (implement) → Rex (review)  
**Priority:** High  
**Created:** 2026-04-16

---

## Summary

Build the first complete version of Quick Fridge Fix — a mobile-first, no-login web app where users type ingredients they have, select serving count, and get 3 easy dinner recipes instantly. Each recipe includes: cooking time, step-by-step instructions, and a mini shopping list for missing ingredients.

---

## Scope

### Backend (`server/`)
- `index.js` — Express server
  - `POST /api/recipes` — accepts `{ ingredients: string, servings: number }`, calls OpenAI GPT-4o-mini, returns 3 recipes as JSON
  - Serves `public/` as static files
  - Rate limiting: 10 requests/IP/minute (use `express-rate-limit`)
  - Input validation: ingredients max 500 chars, servings 1–20
  - Error handling: 400 for bad input, 429 for rate limit, 500 for OpenAI failures
  - CORS: same-origin only
- `prompt.js` — prompt builder
  - `buildPrompt(ingredients, servings)` → returns string
  - Must request structured JSON response from model (enforced via system prompt)
  - JSON schema: `{ recipes: [{ name, cookTime, servings, ingredients_used, ingredients_missing, steps }] }`

### Frontend (`public/`)
- `index.html` — single HTML file, no external JS frameworks
  - Textarea for ingredients (placeholder: "e.g. chicken, garlic, pasta, olive oil")
  - Servings selector (stepper: 1–20, default 2)
  - "Find Recipes" button
  - Results area: 3 recipe cards (hidden until results load)
  - Skeleton loader during fetch
  - Error message display
- `style.css` — mobile-first
  - Max-width 600px centered, works on 375px (iPhone SE) up
  - Clean, modern, food-friendly palette (warm whites, greens, orange accents)
  - Recipe cards with clear visual hierarchy
  - Cooking time badge, ingredient chips, numbered steps
  - No external CSS frameworks — pure CSS only
- `app.js`
  - Handles form submit → POST to `/api/recipes`
  - Renders 3 recipe cards from JSON response
  - Shows/hides skeleton loader
  - Handles and displays errors gracefully

### Root files
- `package.json` — scripts: `start` (`node server/index.js`), `dev` (`nodemon server/index.js`)
- `.env.example` — `OPENAI_API_KEY=`, `PORT=3000`
- `README.md` — setup instructions (install, env, run)

---

## Non-Goals

- No user accounts, login, or sessions
- No database
- No recipe saving or history
- No image generation
- No cuisine filtering (v1 keep it simple)
- No nutritional info
- No framework (React, Vue, etc.) — vanilla only

---

## Acceptance Criteria

1. `POST /api/recipes` with valid ingredients + servings returns 3 recipes in correct JSON schema
2. Frontend renders all 3 cards with: recipe name, cook time, steps (numbered), used ingredients, missing ingredients
3. Rate limiting returns 429 with friendly message
4. Works correctly on mobile (375px width)
5. Skeleton loader shows during fetch, hides on result/error
6. Empty ingredients field shows validation error before submitting
7. Server starts with `npm start` after `.env` is configured

---

## Tests (`tests/`)

Write Jest tests for:
1. `buildPrompt()` — correct format, includes ingredients and servings
2. `POST /api/recipes` — valid input returns 200 with mocked OpenAI response
3. `POST /api/recipes` — missing ingredients returns 400
4. `POST /api/recipes` — ingredients over 500 chars returns 400
5. `POST /api/recipes` — servings out of range returns 400
6. `POST /api/recipes` — rate limit returns 429 after 10 requests (mock time)

Use `supertest` for HTTP tests. Mock OpenAI with `jest.mock`.

---

## Notes for Quinn

- Use `openai` npm package (v4+), `express`, `express-rate-limit`, `dotenv`
- Dev dependency: `nodemon`, `jest`, `supertest`
- The prompt MUST use OpenAI's JSON mode (`response_format: { type: "json_object" }`) to guarantee parseable output
- System prompt should tell the model to act as a friendly chef and return exactly the specified JSON schema
- Keep the CSS warm and inviting — this is a food app, not a SaaS dashboard
- The missing ingredients list should be genuinely useful: only things that are truly needed, not nice-to-haves
