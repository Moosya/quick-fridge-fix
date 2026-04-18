const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getOrCreateUser, createMagicLink, getMagicLink, markLinkUsed, getDb } = require('./db');

router.post('/api/auth/request', async (req, res) => {
  const { email } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const user = getOrCreateUser(email);
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 15 * 60 * 1000;
  createMagicLink(user.id, token, expiresAt);

  if (process.env.NODE_ENV === 'test') {
    console.log('Magic link token (test):', token);
    return res.json({ sent: true });
  }

  try {
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    await resend.emails.send({
      from: 'noreply@fridgetochef.com',
      to: [email],
      subject: 'Sign in to Quick Fridge Fix',
      text: `Click to sign in: ${appUrl}/api/auth/verify?token=${token}\n\nExpires in 15 minutes.`
    });
    return res.json({ sent: true });
  } catch (err) {
    console.error('Resend error:', err);
    return res.status(500).json({ error: 'Failed to send email' });
  }
});

router.get('/api/auth/verify', (req, res) => {
  const { token } = req.query;

  if (!token) return res.status(400).json({ error: 'Token required' });

  const link = getMagicLink(token);
  if (!link || link.used_at) return res.status(400).json({ error: 'Invalid or expired token' });
  if (link.expires_at < Date.now()) return res.status(400).json({ error: 'Token expired' });

  markLinkUsed(token);
  req.session.userId = link.user_id;
  res.redirect('/');
});

router.get('/api/auth/me', (req, res) => {
  if (req.session.userId) {
    const user = getDb().prepare('SELECT id, email FROM users WHERE id = ?').get(req.session.userId);
    return res.json({ user: user || null });
  }
  return res.json({ user: null });
});

router.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

module.exports = router;
