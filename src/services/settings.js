const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

const DEFAULT_SETTINGS = {
  localCountryCode: '',
  phoneFormatConversion: false,
  removeSeparators: false,
  removeSpaces: false
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadSettings() {
  ensureDataDir();
  if (!fs.existsSync(SETTINGS_FILE)) {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch (error) {
    return { ...DEFAULT_SETTINGS };
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
