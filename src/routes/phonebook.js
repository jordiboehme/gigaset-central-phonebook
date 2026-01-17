const express = require('express');
const storage = require('../services/storage');
const xml = require('../services/xml');

const router = express.Router();

// GET /phonebook.xml - Serve XML for Gigaset devices
router.get('/phonebook.xml', (req, res) => {
  try {
    const entries = storage.getAllEntries();
    const xmlContent = xml.generatePhonebookXml(entries);

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(xmlContent);
  } catch (error) {
    res.status(500).send('<?xml version="1.0" encoding="utf-8"?><error>Failed to generate phonebook</error>');
  }
});

module.exports = router;
