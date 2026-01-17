const express = require('express');
const storage = require('../services/storage');
const xml = require('../services/xml');
const cache = require('../services/cache');

const router = express.Router();

// GET /phonebook.xml - Serve XML for Gigaset devices
router.get('/phonebook.xml', (req, res) => {
  try {
    let cached = cache.get();

    // Generate and cache XML if not cached
    if (!cached) {
      const entries = storage.getAllEntries();
      const xmlContent = xml.generatePhonebookXml(entries);
      cached = cache.set(xmlContent);
    }

    // Check If-None-Match header (ETag)
    const ifNoneMatch = req.get('If-None-Match');
    if (ifNoneMatch && ifNoneMatch === `"${cached.eTag}"`) {
      return res.status(304).end();
    }

    // Check If-Modified-Since header
    const ifModifiedSince = req.get('If-Modified-Since');
    if (ifModifiedSince) {
      const clientDate = new Date(ifModifiedSince);
      if (!isNaN(clientDate.getTime()) && clientDate >= cached.lastModified) {
        return res.status(304).end();
      }
    }

    // Set caching headers
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('ETag', `"${cached.eTag}"`);
    res.setHeader('Last-Modified', cached.lastModified.toUTCString());
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.send(cached.xml);
  } catch (error) {
    res.status(500).send('<?xml version="1.0" encoding="utf-8"?><error>Failed to generate phonebook</error>');
  }
});

module.exports = router;
