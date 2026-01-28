const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cache = require('./cache');
const timestamps = require('./timestamps');

const DATA_DIR = path.join(process.cwd(), 'data');
const PHONEBOOK_FILE = path.join(DATA_DIR, 'phonebook.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadPhonebook() {
  ensureDataDir();
  if (!fs.existsSync(PHONEBOOK_FILE)) {
    return { entries: [] };
  }
  const data = fs.readFileSync(PHONEBOOK_FILE, 'utf8');
  return JSON.parse(data);
}

function savePhonebook(phonebook) {
  ensureDataDir();
  fs.writeFileSync(PHONEBOOK_FILE, JSON.stringify(phonebook, null, 2), 'utf8');
  cache.invalidate();
  timestamps.updatePhonebookModified();
}

function generateId() {
  return uuidv4();
}

function getAllEntries() {
  return loadPhonebook().entries;
}

function getEntryById(id) {
  const entries = getAllEntries();
  return entries.find(e => e.id === id);
}

function createEntry(entry) {
  const phonebook = loadPhonebook();
  const newEntry = {
    id: generateId(),
    surname: entry.surname || '',
    name: entry.name || '',
    office1: entry.office1 || '',
    office2: entry.office2 || '',
    mobile1: entry.mobile1 || '',
    mobile2: entry.mobile2 || '',
    home1: entry.home1 || '',
    home2: entry.home2 || ''
  };
  phonebook.entries.push(newEntry);
  savePhonebook(phonebook);
  return newEntry;
}

function updateEntry(id, updates) {
  const phonebook = loadPhonebook();
  const index = phonebook.entries.findIndex(e => e.id === id);
  if (index === -1) {
    return null;
  }
  const entry = phonebook.entries[index];
  phonebook.entries[index] = {
    ...entry,
    surname: updates.surname !== undefined ? updates.surname : entry.surname,
    name: updates.name !== undefined ? updates.name : entry.name,
    office1: updates.office1 !== undefined ? updates.office1 : entry.office1,
    office2: updates.office2 !== undefined ? updates.office2 : entry.office2,
    mobile1: updates.mobile1 !== undefined ? updates.mobile1 : entry.mobile1,
    mobile2: updates.mobile2 !== undefined ? updates.mobile2 : entry.mobile2,
    home1: updates.home1 !== undefined ? updates.home1 : entry.home1,
    home2: updates.home2 !== undefined ? updates.home2 : entry.home2
  };
  savePhonebook(phonebook);
  return phonebook.entries[index];
}

function deleteEntry(id) {
  const phonebook = loadPhonebook();
  const index = phonebook.entries.findIndex(e => e.id === id);
  if (index === -1) {
    return false;
  }
  phonebook.entries.splice(index, 1);
  savePhonebook(phonebook);
  return true;
}

function deleteEntries(ids) {
  const phonebook = loadPhonebook();
  const idsSet = new Set(ids);
  const originalLength = phonebook.entries.length;
  phonebook.entries = phonebook.entries.filter(e => !idsSet.has(e.id));
  const deletedCount = originalLength - phonebook.entries.length;
  savePhonebook(phonebook);
  return deletedCount;
}

function importEntries(entries) {
  const phonebook = loadPhonebook();
  const newEntries = entries.map(entry => ({
    id: generateId(),
    surname: entry.surname || '',
    name: entry.name || '',
    office1: entry.office1 || '',
    office2: entry.office2 || '',
    mobile1: entry.mobile1 || '',
    mobile2: entry.mobile2 || '',
    home1: entry.home1 || '',
    home2: entry.home2 || ''
  }));
  phonebook.entries.push(...newEntries);
  savePhonebook(phonebook);
  return newEntries.length;
}

function getPhonebookJson() {
  return loadPhonebook();
}

function replaceAllEntries(entries) {
  const newEntries = entries.map(entry => ({
    id: generateId(),
    surname: entry.surname || '',
    name: entry.name || '',
    office1: entry.office1 || '',
    office2: entry.office2 || '',
    mobile1: entry.mobile1 || '',
    mobile2: entry.mobile2 || '',
    home1: entry.home1 || '',
    home2: entry.home2 || ''
  }));
  savePhonebook({ entries: newEntries });
  return newEntries.length;
}

module.exports = {
  getAllEntries,
  getEntryById,
  createEntry,
  updateEntry,
  deleteEntry,
  deleteEntries,
  importEntries,
  replaceAllEntries,
  getPhonebookJson
};
