const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const TIMESTAMPS_FILE = path.join(DATA_DIR, 'timestamps.json');

// 24 hours in milliseconds
const BANNER_TIMEOUT_MS = 24 * 60 * 60 * 1000;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadTimestamps() {
  ensureDataDir();
  if (!fs.existsSync(TIMESTAMPS_FILE)) {
    return { phonebookModified: null, gigasetRefreshed: null };
  }
  try {
    const data = fs.readFileSync(TIMESTAMPS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { phonebookModified: null, gigasetRefreshed: null };
  }
}

function saveTimestamps(timestamps) {
  ensureDataDir();
  fs.writeFileSync(TIMESTAMPS_FILE, JSON.stringify(timestamps, null, 2), 'utf8');
}

/**
 * Update the phonebook modification timestamp.
 * Called when phonebook entries are added, modified, or deleted.
 */
function updatePhonebookModified() {
  const timestamps = loadTimestamps();
  timestamps.phonebookModified = Date.now();
  saveTimestamps(timestamps);
}

/**
 * Update the Gigaset refresh timestamp.
 * Called after successful refresh of Gigaset device.
 */
function updateGigasetRefreshed() {
  const timestamps = loadTimestamps();
  timestamps.gigasetRefreshed = Date.now();
  saveTimestamps(timestamps);
}

/**
 * Check if the phonebook needs to be refreshed on the Gigaset device.
 * Returns true if:
 * - phonebook has changed since last refresh AND
 * - the change happened within the last 24 hours
 */
function needsRefresh() {
  const timestamps = loadTimestamps();

  // No phonebook modification recorded
  if (!timestamps.phonebookModified) {
    return false;
  }

  // Check if change is older than 24 hours (auto-dismiss)
  const now = Date.now();
  if (now - timestamps.phonebookModified > BANNER_TIMEOUT_MS) {
    return false;
  }

  // If never refreshed, needs refresh
  if (!timestamps.gigasetRefreshed) {
    return true;
  }

  // Needs refresh if phonebook was modified after last refresh
  return timestamps.phonebookModified > timestamps.gigasetRefreshed;
}

/**
 * Get the current timestamps for status display.
 */
function getTimestamps() {
  return loadTimestamps();
}

module.exports = {
  updatePhonebookModified,
  updateGigasetRefreshed,
  needsRefresh,
  getTimestamps
};
