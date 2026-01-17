const express = require('express');
const path = require('path');
const apiRoutes = require('./routes/api');
const phonebookRoutes = require('./routes/phonebook');

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_USER = process.env.AUTH_USER;
const AUTH_PASS = process.env.AUTH_PASS;

// Basic auth middleware
function basicAuth(req, res, next) {
  // Skip auth if credentials not configured
  if (!AUTH_USER || !AUTH_PASS) {
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
  const [user, pass] = credentials.split(':');

  if (user === AUTH_USER && pass === AUTH_PASS) {
    return next();
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Phonebook"');
  return res.status(401).send('Invalid credentials');
}

// Middleware
app.use(basicAuth);
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api', apiRoutes);
app.use('/', phonebookRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Gigaset Phonebook Server running on port ${PORT}`);
  console.log(`Web UI: http://localhost:${PORT}`);
  console.log(`Phonebook XML: http://localhost:${PORT}/phonebook.xml`);
  if (AUTH_USER && AUTH_PASS) {
    console.log('Basic authentication enabled');
  } else {
    console.log('Warning: No authentication configured');
  }
});
