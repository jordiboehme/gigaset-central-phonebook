const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

const DEFAULT_SETTINGS = {
  localCountryCode: '',
  phoneFormatConversion: false,
  removeSeparators: false,
  removeSpaces: false,
  gigaset: {
    deviceUrl: '',
    username: '',
    password: '',
    showRefreshReminder: true
  }
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadSettings() {
  ensureDataDir();
  if (!fs.existsSync(SETTINGS_FILE)) {
    return { ...DEFAULT_SETTINGS, gigaset: { ...DEFAULT_SETTINGS.gigaset } };
  }
  try {
    const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
    const parsed = JSON.parse(data);
    // Deep merge for nested gigaset object
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      gigaset: {
        ...DEFAULT_SETTINGS.gigaset,
        ...(parsed.gigaset || {})
      }
    };
  } catch (error) {
    return { ...DEFAULT_SETTINGS, gigaset: { ...DEFAULT_SETTINGS.gigaset } };
  }
}

function saveSettings(settings) {
  ensureDataDir();
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

function getSettings() {
  return loadSettings();
}

function updateSettings(updates) {
  const current = loadSettings();
  const updated = {
    ...current,
    localCountryCode: updates.localCountryCode !== undefined ? updates.localCountryCode : current.localCountryCode,
    phoneFormatConversion: updates.phoneFormatConversion !== undefined ? updates.phoneFormatConversion : current.phoneFormatConversion,
    removeSeparators: updates.removeSeparators !== undefined ? updates.removeSeparators : current.removeSeparators,
    removeSpaces: updates.removeSpaces !== undefined ? updates.removeSpaces : current.removeSpaces
  };

  // Handle nested gigaset settings
  if (updates.gigaset !== undefined) {
    const currentGigaset = current.gigaset || DEFAULT_SETTINGS.gigaset;
    updated.gigaset = {
      deviceUrl: updates.gigaset.deviceUrl !== undefined ? updates.gigaset.deviceUrl : currentGigaset.deviceUrl,
      username: updates.gigaset.username !== undefined ? updates.gigaset.username : currentGigaset.username,
      password: updates.gigaset.password !== undefined ? updates.gigaset.password : currentGigaset.password,
      showRefreshReminder: updates.gigaset.showRefreshReminder !== undefined ? updates.gigaset.showRefreshReminder : currentGigaset.showRefreshReminder
    };
  }

  return saveSettings(updated);
}

function isConfigured() {
  const settings = loadSettings();
  return settings.localCountryCode && settings.localCountryCode.length > 0;
}

module.exports = {
  getSettings,
  updateSettings,
  isConfigured,
  DEFAULT_SETTINGS
};
