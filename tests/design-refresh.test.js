/**
 * QFF-003: Design refresh — acceptance tests
 * Verifies palette swap, typography, and microcopy changes.
 */

const fs = require('fs');
const path = require('path');

const CSS_PATH = path.join(__dirname, '../public/style.css');
const HTML_PATH = path.join(__dirname, '../public/index.html');
const JS_PATH = path.join(__dirname, '../public/app.js');

let css, html, js;

beforeAll(() => {
  css = fs.readFileSync(CSS_PATH, 'utf8');
  html = fs.readFileSync(HTML_PATH, 'utf8');
  js = fs.readFileSync(JS_PATH, 'utf8');
});

// ── Palette ────────────────────────────────────────────────────────────────────

describe('QFF-003: Palette', () => {
  test('--primary is paprika orange #D4522A in :root', () => {
    expect(css).toMatch(/--primary:\s*#D4522A/i);
  });

  test('--primary-green is removed from style.css', () => {
    expect(css).not.toMatch(/--primary-green/);
  });

  test('--accent-orange is removed from style.css', () => {
    expect(css).not.toMatch(/--accent-orange/);
  });

  test('background is warm off-white #FAF7F2', () => {
    expect(css).toMatch(/#FAF7F2/i);
  });

  test('text is near-black #1A1208', () => {
    expect(css).toMatch(/#1A1208/i);
  });

  test('olive accent #4A5240 is defined in :root', () => {
    expect(css).toMatch(/--olive:\s*#4A5240/i);
  });

  test('old primary green #2D6A4F is not hardcoded in style.css', () => {
    expect(css).not.toMatch(/#2D6A4F/i);
  });

  test('old hover green #1b4332 is not hardcoded in style.css', () => {
    expect(css).not.toMatch(/#1b4332/i);
  });
});

// ── Typography ─────────────────────────────────────────────────────────────────

describe('QFF-003: Typography', () => {
  test('Playfair Display is imported in style.css', () => {
    expect(css).toMatch(/Playfair Display/);
  });

  test('Inter is imported in style.css', () => {
    expect(css).toMatch(/Inter/);
  });

  test('index.html includes Google Fonts link for Playfair Display', () => {
    expect(html).toMatch(/fonts\.googleapis\.com.*Playfair\+Display/);
  });

  test('index.html includes Google Fonts link for Inter', () => {
    expect(html).toMatch(/fonts\.googleapis\.com.*Inter/);
  });
});

// ── Microcopy ──────────────────────────────────────────────────────────────────

describe('QFF-003: Microcopy', () => {
  test('tagline reads "Dinner ideas from whatever\'s in your fridge."', () => {
    expect(html).toMatch(/Dinner ideas from whatever.s in your fridge\./);
  });

  test('textarea placeholder updated to mention "half a lemon"', () => {
    expect(html).toMatch(/half a lemon/);
  });

  test('refine panel header reads "Tweak it"', () => {
    expect(js).toMatch(/Tweak it/);
  });

  test('regenerate button reads "↻ Try again"', () => {
    expect(js).toMatch(/↻ Try again/);
  });

  test('old "🔄 Regenerate" string is removed from app.js', () => {
    expect(js).not.toMatch(/🔄 Regenerate/);
  });
});
