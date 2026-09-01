const { createApp } = require('./app');

const PORT = process.env.PORT || 3000;
const AUTH_USER = process.env.AUTH_USER;
const AUTH_PASS = process.env.AUTH_PASS;

const app = createApp({ authUser: AUTH_USER, authPass: AUTH_PASS });

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
