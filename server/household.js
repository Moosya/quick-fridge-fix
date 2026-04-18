const express = require('express');
const router = express.Router();
const { createHouseholdProfile, getHouseholdProfiles, deleteHouseholdProfile } = require('./db');

const VALID_FLAGS = [
  'vegetarian', 
  'vegan', 
  'gluten-free', 
  'dairy-free', 
  'nut-free', 
  'halal', 
  'kosher', 
  'pescatarian', 
  'low-carb', 
  'picky-eater'
];

// GET all household profiles for authenticated user
router.get('/api/household', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const profiles = getHouseholdProfiles(req.session.userId);
    res.json({ profiles });
  } catch (err) {
    console.error('Error fetching household profiles:', err);
    res.status(500).json({ error: 'Failed to fetch household profiles' });
  }
});

// POST create new household profile
router.post('/api/household', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const { name, dietary_flags = [] } = req.body;
  
  // Validate name
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  
  // Validate dietary_flags array
  if (!Array.isArray(dietary_flags)) {
    return res.status(400).json({ error: 'dietary_flags must be an array' });
  }
  
  const invalid = dietary_flags.filter(f => !VALID_FLAGS.includes(f));
  if (invalid.length > 0) {
    return res.status(400).json({ 
      error: `Invalid flags: ${invalid.join(', ')}. Valid: ${VALID_FLAGS.join(', ')}` 
    });
  }
  
  try {
    const profile = createHouseholdProfile(req.session.userId, name.trim(), dietary_flags);
    res.status(201).json(profile);
  } catch (err) {
    console.error('Error creating household profile:', err);
    res.status(500).json({ error: 'Failed to create household profile' });
  }
});

// DELETE household profile by id
router.delete('/api/household/:id', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  
  try {
    const deleted = deleteHouseholdProfile(id, req.session.userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Profile not found or access denied' });
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error('Error deleting household profile:', err);
    res.status(500).json({ error: 'Failed to delete household profile' });
  }
});

module.exports = router;
