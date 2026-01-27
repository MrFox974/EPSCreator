require('dotenv').config()

// Trigger redeploy
const express = require('express')
const app = express()
const { connectToDB, connectModels } = require('./config/database')
const cors = require('cors')

// Configuration CORS : accepte uniquement l'origine définie dans CORS_ORIGIN
// Retire le slash final pour matcher l'en-tête Origin envoyé par le navigateur (sans slash)
const allowedOrigin = (process.env.CORS_ORIGIN || 'http://localhost:5173').trim().replace(/\/$/, '');

console.log('CORS Configuration - Allowed Origin:', allowedOrigin);

const isOriginAllowed = (origin) => !origin || origin === allowedOrigin;

// Middleware CORS personnalisé pour Lambda Function URL
app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log('Request Origin:', origin);
  console.log('Request Method:', req.method);
  console.log('Request Path:', req.path);

  // Pas d'Origin = requête directe (health check, curl, etc.) → autorisée
  // Sinon, l'origine doit correspondre (sans slash final)
  if (isOriginAllowed(origin)) {
    if (origin) {
      res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-CSRF-Token');
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  // Gère les requêtes OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return isOriginAllowed(origin) ? res.sendStatus(200) : res.sendStatus(403);
  }

  next();
});

// Configuration CORS avec Express CORS middleware
app.use(cors({
  origin: function (origin, callback) {
    console.log('CORS check - Origin:', origin, 'Allowed:', allowedOrigin);
    // Pas d'Origin ou origine autorisée → accepter
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-CSRF-Token']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false })); 
// Ne pas toucher à extended: true, ça peut causer des problèmes avec les données de la BDD.

require('./models/Test');

app.use('/api', require('./router/test.route'))

// Middleware de gestion d'erreur global
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  const origin = req.headers.origin;
  const allowed = (process.env.CORS_ORIGIN || 'http://localhost:5173').trim().replace(/\/$/, '');
  const ok = !origin || origin === allowed;

  // Ajoute les headers CORS même en cas d'erreur
  if (ok && origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
});

// Initialise la connexion DB (non-bloquant pour Lambda)
connectToDB().catch(err => {
  console.error('Failed to connect to database:', err);
});

connectModels({ force: false }).catch(err => {
  console.error('Failed to sync models:', err);
});

module.exports = app