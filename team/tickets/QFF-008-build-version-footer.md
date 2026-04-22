# QFF-008: Build Version Footer

**Priority:** Medium  
**Created:** 2026-04-22  
**Status:** Ready for implementation

## Problem

After a Railway deploy, there's no way to confirm from the UI that the new code is live. Hard-refreshing the page doesn't give any visual indicator of which build is running.

## Solution

Add a small build version indicator to the footer of `index.html` and `cookbook.html`. The version string is served from the Express backend using `RAILWAY_GIT_COMMIT_SHA` (auto-injected by Railway) falling back to `process.env.npm_package_version` then `"dev"`.

## Implementation

### 1. New API endpoint in `server/index.js`

Add a `/api/version` endpoint:

```js
app.get('/api/version', (req, res) => {
  const sha = process.env.RAILWAY_GIT_COMMIT_SHA;
  const short = sha ? sha.slice(0, 7) : null;
  const version = process.env.npm_package_version || null;
  res.json({ build: short || version || 'dev' });
});
```

### 2. Footer HTML in both `public/index.html` and `public/cookbook.html`

Add before `</body>`:

```html
<footer class="build-footer">
  <span id="build-version">build: —</span>
</footer>
```

### 3. CSS in `public/style.css`

```css
.build-footer {
  text-align: center;
  padding: 12px;
  font-size: 0.7rem;
  color: rgba(255,255,255,0.2);
  letter-spacing: 0.05em;
}
```

### 4. JS fetch in `public/app.js` (and cookbook equivalent if separate)

On DOMContentLoaded, fetch and inject:

```js
fetch('/api/version')
  .then(r => r.json())
  .then(d => {
    const el = document.getElementById('build-version');
    if (el) el.textContent = 'build: ' + d.build;
  })
  .catch(() => {}); // silent fail — non-critical
```

## Acceptance Criteria

- [ ] `/api/version` returns `{ build: "<7-char-sha>" }` on Railway, `{ build: "dev" }` locally
- [ ] Footer visible on both `index.html` and `cookbook.html`
- [ ] Footer text is subtle — does not distract from main UI
- [ ] Hard refresh after Railway deploy shows updated SHA within a few seconds
- [ ] Silent fail if fetch errors (no console noise, no broken UI)
- [ ] All existing tests still pass (49/49)
- [ ] No new test required (purely cosmetic/diagnostic, non-critical path)

## Files to Modify

- `server/index.js` — add `/api/version` route
- `public/index.html` — add footer element
- `public/cookbook.html` — add footer element  
- `public/style.css` — add `.build-footer` style
- `public/app.js` — add version fetch on load
