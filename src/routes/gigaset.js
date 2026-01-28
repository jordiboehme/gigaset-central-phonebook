const express = require('express');
const router = express.Router();
const gigaset = require('../services/gigaset');
const settings = require('../services/settings');
const timestamps = require('../services/timestamps');

/**
 * POST /api/gigaset/test
 * Test connection to Gigaset device with provided credentials.
 */
router.post('/test', async (req, res) => {
  const { deviceUrl, username, password } = req.body;

  if (!deviceUrl || !username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Device URL, username, and password are required'
    });
  }

  try {
    const result = await gigaset.testConnection(deviceUrl, username, password);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/gigaset/refresh
 * Trigger phonebook refresh using stored credentials.
 */
router.post('/refresh', async (req, res) => {
  const currentSettings = settings.getSettings();
  const gigasetConfig = currentSettings.gigaset || {};

  if (!gigasetConfig.deviceUrl || !gigasetConfig.username || !gigasetConfig.password) {
    return res.status(400).json({
      success: false,
      message: 'Gigaset device not configured. Please configure in Settings.'
    });
  }

  try {
    // Decrypt the stored password
    const password = gigaset.decryptPassword(gigasetConfig.password);
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Failed to decrypt stored password. Please re-enter credentials.'
      });
    }

    const result = await gigaset.triggerRefresh(
      gigasetConfig.deviceUrl,
      gigasetConfig.username,
      password
    );

    if (result.success) {
      // Update the refresh timestamp
      timestamps.updateGigasetRefreshed();
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/gigaset/status
 * Get Gigaset configuration status and refresh status.
 */
router.get('/status', (req, res) => {
  const currentSettings = settings.getSettings();
  const gigasetConfig = currentSettings.gigaset || {};
  const ts = timestamps.getTimestamps();

  res.json({
    configured: !!(gigasetConfig.deviceUrl && gigasetConfig.username && gigasetConfig.password),
    deviceUrl: gigasetConfig.deviceUrl || '',
    username: gigasetConfig.username || '',
    hasPassword: !!gigasetConfig.password,
    showRefreshReminder: gigasetConfig.showRefreshReminder !== false,
    needsRefresh: timestamps.needsRefresh(),
    phonebookModified: ts.phonebookModified,
    gigasetRefreshed: ts.gigasetRefreshed
  });
});

module.exports = router;
