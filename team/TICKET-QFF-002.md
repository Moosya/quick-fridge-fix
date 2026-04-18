# TICKET-QFF-002 — Recipe Refinement Panel: Style Toggles + Avoid Ingredients

**Status:** Open  
**Assigned:** Quinn (implement) → Rex (review)  
**Priority:** Medium  
**Created:** 2026-04-17

---

## Summary

After the first set of recipes loads, show a "Refine results" panel that lets users tweak the output without re-entering their ingredients. Two controls:

1. **Style toggles** — mutually exclusive buttons: `🌶️ Spicier`, `🥗 Healthier`, `🍝 Heartier`, `🌍 Different cuisine`. Selecting one regenerates with that style direction.
2. **Avoid field** — plain text input: "Avoid ingredients (e.g. cilantro, nuts, dairy)". Applied on next generation.

The panel appears *after* results are shown, not on first load. Both inputs are optional and passed to the existing `/api/recipes` endpoint (no new endpoint needed).

---

## Scope

### Backend (`server/prompt.js`)
- Update `buildPrompt(ingredients, servings, options)` to accept optional third argument:
  ```js
  options = { style: string | null, avoid: string | null }
  ```
- If `options.style` is set, append to user message:
  `"Style preference: make the recipes ${style}."`
  Where style values map to: `spicier` → `"spicier and bolder"`, `healthier` → `"lighter and healthier"`, `heartier` → `"more filling and hearty"`, `different` → `"from a completely different cuisine than the obvious choice"`
- If `options.avoid` is set, append to user message:
  `"Do not use these ingredients: ${avoid}."`
- Both are optional — existing calls without `options` must still work identically

### Backend (`server/index.js`)
- Update `POST /api/recipes` to read optional `style` and `avoid` from request body
- Validate `avoid` max 200 chars (return 400 if exceeded)
- `style` must be one of: `spicier`, `healthier`, `heartier`, `different`, or absent/null (return 400 if invalid value sent)
- Pass both to `buildPrompt(ingredients, servingsNum, { style, avoid })`

### Frontend (`public/app.js`)
- After `renderRecipes()` runs, call `renderRefinePanel()` which appends a refine section below the results
- State: track `currentStyle = null` and `currentAvoid = ''`
- Style buttons: clicking one selects it (add `.active` class, remove from others). Clicking the active button again deselects it (toggle off).
- Avoid field: plain `<input type="text">` with placeholder `"e.g. cilantro, nuts, dairy"`
- Add a `🔄 Regenerate` button that re-runs the fetch with current `ingredients`, `servings`, `currentStyle`, and `currentAvoid`
- On regenerate: same loading flow as initial (skeleton, disable button, hide old results)
- On new results: re-render cards, keep refine panel visible with current selections intact
- If refine panel already exists (user hits regenerate multiple times), do NOT duplicate it — reuse existing

### Frontend (`public/index.html`)
- No structural changes needed — refine panel is injected by `app.js`

### Frontend (`public/style.css`)
- `.refine-panel` — subtle section below results, slight top border/separator
- `.style-btn` — pill-shaped toggle buttons, default neutral style
- `.style-btn.active` — highlighted state (use existing accent color)
- `.avoid-input` — full-width text input, matches existing input style
- `.regenerate-btn` — matches `.find-btn` style

---

## Non-Goals

- No server-side session or memory between requests — each regenerate is a fresh call
- No saving of style preferences
- No cuisine-specific dropdowns or autocomplete on avoid field
- No changes to the recipe card UI
- Do not add a new API endpoint — extend existing `/api/recipes`

---

## Files to Modify

- `server/prompt.js`
- `server/index.js`
- `public/app.js`
- `public/style.css`

---

## Tests (`tests/`)

Add to `tests/prompt.test.js`:

### Test 1: buildPrompt includes style when provided
```js
test('buildPrompt includes style directive when style is set', () => {
  const messages = buildPrompt('chicken, rice', 2, { style: 'spicier', avoid: null });
  const userMsg = messages.find(m => m.role === 'user').content;
  expect(userMsg).toMatch(/spicier and bolder/i);
});
```

### Test 2: buildPrompt includes avoid when provided
```js
test('buildPrompt includes avoid directive when avoid is set', () => {
  const messages = buildPrompt('chicken, rice', 2, { style: null, avoid: 'cilantro, nuts' });
  const userMsg = messages.find(m => m.role === 'user').content;
  expect(userMsg).toMatch(/cilantro, nuts/i);
});
```

### Test 3: buildPrompt works without options (backward compat)
```js
test('buildPrompt works without options argument', () => {
  expect(() => buildPrompt('eggs, cheese', 2)).not.toThrow();
  const messages = buildPrompt('eggs, cheese', 2);
  expect(messages).toHaveLength(2);
});
```

Add to `tests/server.test.js`:

### Test 4: style param passed through correctly
```js
test('POST /api/recipes accepts valid style param', async () => {
  // mock OpenAI response
  const res = await request(app)
    .post('/api/recipes')
    .send({ ingredients: 'pasta, tomato', servings: 2, style: 'healthier' });
  expect([200, 500]).toContain(res.status); // 500 ok if OpenAI not mocked, just no 400
});
```

### Test 5: invalid style rejected
```js
test('POST /api/recipes rejects invalid style value', async () => {
  const res = await request(app)
    .post('/api/recipes')
    .send({ ingredients: 'pasta, tomato', servings: 2, style: 'random-invalid' });
  expect(res.status).toBe(400);
});
```

### Test 6: avoid over 200 chars rejected
```js
test('POST /api/recipes rejects avoid over 200 chars', async () => {
  const res = await request(app)
    .post('/api/recipes')
    .send({ ingredients: 'pasta', servings: 2, avoid: 'x'.repeat(201) });
  expect(res.status).toBe(400);
});
```

---

## Acceptance Criteria

- [ ] `buildPrompt` accepts optional `options` arg; backward compatible with 2-arg calls
- [ ] Style toggles appear below results, one selectable at a time (deselectable)
- [ ] Avoid field accepts free text up to 200 chars
- [ ] Regenerate button re-runs fetch with current style + avoid values
- [ ] Refine panel persists across regenerations (not duplicated)
- [ ] Invalid style value returns 400 from API
- [ ] Avoid > 200 chars returns 400 from API
- [ ] All 6 new tests pass
- [ ] All existing 10 tests still pass
- [ ] `npm test` shows 16 passing, 0 failing

---

## Notes for Quinn

- `buildPrompt` signature change: `buildPrompt(ingredients, servings, options = {})` — default empty object so existing callers don't break
- Style map (use this exactly):
  ```js
  const STYLE_MAP = {
    spicier: 'spicier and bolder',
    healthier: 'lighter and healthier',
    heartier: 'more filling and hearty',
    different: 'from a completely different cuisine than the obvious choice',
  };
  ```
- Valid style values for server validation: `Object.keys(STYLE_MAP)`
- Refine panel injection: call `renderRefinePanel()` at end of `renderRecipes()`, guard with `if (!document.getElementById('refine-panel'))` to prevent duplicates
- The `🔄 Regenerate` button should reuse the same fetch/render flow — extract it into a `fetchRecipes(ingredients, servings, style, avoid)` function so both the initial Find and Regenerate call the same code path
