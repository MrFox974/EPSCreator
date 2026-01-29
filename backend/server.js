// server.js (dev local)
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || process.env.SERVER_PORT || 8080;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Garder le processus actif et logger les erreurs
server.on('error', (err) => {
  console.error('Server error:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Empêcher la fermeture automatique
process.stdin.resume();