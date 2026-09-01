const crypto = require('crypto');

let cache = { xml: null, eTag: null, lastModified: null };

function invalidate() {
  cache = { xml: null, eTag: null, lastModified: null };
}

function get() {
  return cache.xml ? cache : null;
}

function set(xml, lastModified) {
  cache = {
    xml,
    eTag: crypto.createHash('md5').update(xml).digest('hex'),
    lastModified: lastModified || new Date()
  };
  return cache;
}

module.exports = { invalidate, get, set };
