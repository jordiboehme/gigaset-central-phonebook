const express = require('express');
const path = require('path');
const crypto = require('crypto');
const apiRoutes = require('./routes/api');
const phonebookRoutes = require('./routes/phonebook');
const settingsRoutes = require('./routes/settings');
const gigasetRoutes = require('./routes/gigaset');

// Constant-time string comparison to avoid leaking credential length/content via timing
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function createBasicAuth(authUser, authPass) {
  return function basicAuth(req, res, next) {
    // Skip auth if credentials not configured
    if (!authUser || !authPass) {
      return next();
    }

    // Allow phonebook.xml endpoint without auth (for Gigaset devices)
    if (req.path === '/phonebook.xml') {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Phonebook"');
      return res.status(401).send('Authentication required');
    }

    const credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
    // Split on the first colon only, so passwords containing ':' work
    const colonIndex = credentials.indexOf(':');
    const user = colonIndex === -1 ? credentials : credentials.slice(0, colonIndex);
    const pass = colonIndex === -1 ? '' : credentials.slice(colonIndex + 1);

    if (safeEqual(user, authUser) && safeEqual(pass, authPass)) {
      return next();
    }

    res.setHeader('WWW-Authenticate', 'Basic realm="Phonebook"');
    return res.status(401).send('Invalid credentials');
  };
}

function createApp({ authUser, authPass } = {}) {
  const app = express();
  app.disable('x-powered-by');

  // Middleware
  app.use(createBasicAuth(authUser, authPass));
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  // Routes
  app.use('/api', apiRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/gigaset', gigasetRoutes);
  app.use('/', phonebookRoutes);

  return app;
}

module.exports = { createApp };
