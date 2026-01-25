const express = require('express');
const settings = require('../services/settings');

const router = express.Router();

// GET /api/settings - Get current settings
router.get('/', (req, res) => {
  try {
    const currentSettings = settings.getSettings();
    res.json(currentSettings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

// PUT /api/settings - Update settings
router.put('/', (req, res) => {
  try {
    const updated = settings.updateSettings(req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
