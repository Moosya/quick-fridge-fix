const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DB_PATH || 'data/qff.db';
const dbDir = path.dirname(dbPath);

if (dbDir !== '.' && !fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// ':memory:' for tests, file path for prod
const db = new DatabaseSync(dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS magic_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS saved_recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  cook_time TEXT,
  servings INTEGER,
  ingredients_used TEXT,
  ingredients_missing TEXT,
  steps TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS household_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  dietary_flags TEXT DEFAULT '[]',
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`);

function getOrCreateUser(email) {
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    db.prepare('INSERT INTO users (email) VALUES (?)').run(email);
    user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  }
  return user;
}

function createMagicLink(userId, token, expiresAt) {
  db.prepare('INSERT INTO magic_links (user_id, token, expires_at) VALUES (?, ?, ?)').run(userId, token, expiresAt);
  return getMagicLink(token);
}

function getMagicLink(token) {
  return db.prepare('SELECT * FROM magic_links WHERE token = ?').get(token);
}

function markLinkUsed(token) {
  db.prepare('UPDATE magic_links SET used_at = unixepoch() WHERE token = ?').run(token);
}

function saveRecipe(userId, recipe) {
  db.prepare(`
    INSERT INTO saved_recipes (user_id, name, cook_time, servings, ingredients_used, ingredients_missing, steps)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, recipe.name, recipe.cook_time || null, recipe.servings || null,
    recipe.ingredients_used || null, recipe.ingredients_missing || null, recipe.steps || null);
  return db.prepare('SELECT * FROM saved_recipes WHERE rowid = last_insert_rowid()').get();
}

function getSavedRecipes(userId) {
  return db.prepare('SELECT * FROM saved_recipes WHERE user_id = ? ORDER BY created_at DESC').all(userId);
}

function getDb() {
  return db;
}

function createHouseholdProfile(userId, name, flags) {
  db.prepare('INSERT INTO household_profiles (user_id, name, dietary_flags) VALUES (?, ?, ?)').run(userId, name, JSON.stringify(flags || []));
  return db.prepare('SELECT * FROM household_profiles WHERE rowid = last_insert_rowid()').get();
}

function getHouseholdProfiles(userId) {
  return db.prepare('SELECT * FROM household_profiles WHERE user_id = ? ORDER BY created_at ASC').all(userId)
    .map(p => ({ ...p, dietary_flags: JSON.parse(p.dietary_flags || '[]') }));
}

function deleteHouseholdProfile(id, userId) {
  const result = db.prepare('DELETE FROM household_profiles WHERE id = ? AND user_id = ?').run(id, userId);
  return result.changes > 0;
}

module.exports = { getOrCreateUser, createMagicLink, getMagicLink, markLinkUsed, saveRecipe, getSavedRecipes, getDb, createHouseholdProfile, getHouseholdProfiles, deleteHouseholdProfile };
