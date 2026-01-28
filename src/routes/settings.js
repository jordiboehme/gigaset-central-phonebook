const express = require('express');
const settings = require('../services/settings');
const gigaset = require('../services/gigaset');

const router = express.Router();

// GET /api/settings - Get current settings
router.get('/', (req, res) => {
  try {
    const currentSettings = settings.getSettings();
    // Don't expose the encrypted password
    const response = {
      ...currentSettings,
      gigaset: {
        ...currentSettings.gigaset,
        password: undefined,
        hasPassword: !!currentSettings.gigaset?.password
      }
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

// PUT /api/settings - Update settings
router.put('/', (req, res) => {
  try {
    const updates = { ...req.body };

    // Encrypt password if provided in gigaset settings
    if (updates.gigaset && updates.gigaset.password) {
      updates.gigaset = {
        ...updates.gigaset,
        password: gigaset.encryptPassword(updates.gigaset.password)
      };
    }

    const updated = settings.updateSettings(updates);

    // Don't expose the encrypted password in response
    const response = {
      ...updated,
      gigaset: {
        ...updated.gigaset,
        password: undefined,
        hasPassword: !!updated.gigaset?.password
      }
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
