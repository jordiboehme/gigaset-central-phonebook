const express = require('express');
const multer = require('multer');
const storage = require('../services/storage');
const vcard = require('../services/vcard');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/entries - List all entries (with optional search)
router.get('/entries', (req, res) => {
  try {
    let entries = storage.getAllEntries();

    // Search/filter
    const search = req.query.search;
    if (search) {
      const searchLower = search.toLowerCase();
      entries = entries.filter(e =>
        (e.surname && e.surname.toLowerCase().includes(searchLower)) ||
        (e.name && e.name.toLowerCase().includes(searchLower)) ||
        (e.office1 && e.office1.includes(search)) ||
        (e.office2 && e.office2.includes(search)) ||
        (e.mobile1 && e.mobile1.includes(search)) ||
        (e.mobile2 && e.mobile2.includes(search)) ||
        (e.home1 && e.home1.includes(search)) ||
        (e.home2 && e.home2.includes(search))
      );
    }

    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load entries' });
  }
});

// POST /api/entries - Create single entry
router.post('/entries', (req, res) => {
  try {
    const entry = storage.createEntry(req.body);
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

// PUT /api/entries/:id - Update entry
router.put('/entries/:id', (req, res) => {
  try {
    const entry = storage.updateEntry(req.params.id, req.body);
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

// DELETE /api/entries/:id - Delete single entry
router.delete('/entries/:id', (req, res) => {
  try {
    const deleted = storage.deleteEntry(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

// DELETE /api/entries - Batch delete
router.delete('/entries', (req, res) => {
  try {
    const ids = req.body.ids;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'ids must be an array' });
    }
    const deletedCount = storage.deleteEntries(ids);
    res.json({ deleted: deletedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete entries' });
  }
});

// POST /api/import - Upload vCard file
router.post('/import', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const content = req.file.buffer.toString('utf8');
    const contacts = vcard.parseVCard(content);

    if (contacts.length === 0) {
      return res.status(400).json({ error: 'No valid contacts found in file' });
    }

    const importedCount = storage.importEntries(contacts);
    res.json({ imported: importedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to import vCard file' });
  }
});

// GET /api/export - Download phonebook.json
router.get('/export', (req, res) => {
  try {
    const phonebook = storage.getPhonebookJson();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="phonebook.json"');
    res.json(phonebook);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export phonebook' });
  }
});

// POST /api/import-json - Import JSON phonebook file
router.post('/import-json', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const content = req.file.buffer.toString('utf8');
    let data;
    try {
      data = JSON.parse(content);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON file' });
    }

    if (!data.entries || !Array.isArray(data.entries)) {
      return res.status(400).json({ error: 'Invalid phonebook format: missing entries array' });
    }

    const mode = req.query.mode || 'merge';
    let importedCount;

    if (mode === 'replace') {
      importedCount = storage.replaceAllEntries(data.entries);
    } else {
      importedCount = storage.importEntries(data.entries);
    }

    res.json({ imported: importedCount, replaced: mode === 'replace' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to import JSON file' });
  }
});

module.exports = router;
