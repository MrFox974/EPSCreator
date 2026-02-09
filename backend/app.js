require('dotenv').config()

// Trigger redeploy (test)
const express = require('express')
const app = express()
const { connectToDB, connectModels } = require('./config/database')
const cors = require('cors')

// Configuration CORS : accepte uniquement l'origine définie dans CORS_ORIGIN
// Retire le slash final pour matcher l'en-tête Origin envoyé par le navigateur (sans slash)
const allowedOrigin = (process.env.CORS_ORIGIN || 'http://localhost:5173').trim().replace(/\/$/, '');

console.log('CORS Configuration - Allowed Origin:', allowedOrigin);

const isOriginAllowed = (origin) => !origin || origin === allowedOrigin;

// Gérer les requêtes OPTIONS (preflight) explicitement AVANT le middleware CORS ()
app.options('*', (req, res) => {
  const origin = req.headers.origin || req.headers.Origin;
  console.log('OPTIONS preflight - Origin:', origin, 'Allowed:', allowedOrigin, 'CORS_ORIGIN env:', process.env.CORS_ORIGIN);
  
  if (isOriginAllowed(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With');
    res.header('Access-Control-Max-Age', '86400');
    console.log('OPTIONS preflight - Headers CORS ajoutés pour:', origin);
    return res.status(200).end();
  }
  
  console.log('OPTIONS preflight - Origin non autorisée:', origin);
  res.status(403).end();
});

// Un seul middleware CORS pour éviter le header Access-Control-Allow-Origin en double
app.use(cors({
  origin: function (origin, callback) {
    console.log('CORS check - Origin:', origin, 'Allowed:', allowedOrigin, 'CORS_ORIGIN env:', process.env.CORS_ORIGIN);
    // Pas d'Origin (requêtes sans Origin comme curl) ou origine autorisée → accepter
    if (isOriginAllowed(origin)) {
      console.log('CORS check - Origin autorisée');
      return callback(null, true);
    }
    console.log('CORS check - Origin refusée');
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400 // 24 heures pour le cache preflight
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false })); 
// Ne pas toucher à extended: true, ça peut causer des problèmes avec les données de la BDD.

// Middleware pour ajouter les headers CORS à toutes les réponses (backup si cors() ne fonctionne pas)
app.use((req, res, next) => {
  const origin = req.headers.origin || req.headers.Origin;
  if (isOriginAllowed(origin) && origin) {
    // Ne pas écraser si déjà défini par cors()
    if (!res.getHeader('Access-Control-Allow-Origin')) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }
  }
  next();
});

require('./models/Test');
require('./models/index'); // Charge tous les modèles avec leurs associations

// Route de health check à la racine
app.get('/', (req, res) => {
  const origin = req.headers.origin || req.headers.Origin;
  const allowed = (process.env.CORS_ORIGIN || 'http://localhost:5173').trim().replace(/\/$/, '');
  
  if (origin && (!allowed || origin === allowed)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  
  res.json({ 
    status: 'ok', 
    message: 'Lambda Function URL is working',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', require('./router/test.route'));
app.use('/api', require('./router/fiche-eps.route'));
app.use('/api', require('./router/ecole.route'));
app.use('/api', require('./router/classe.route'));
app.use('/api', require('./router/activite-support.route'));
app.use('/api', require('./router/sequence.route'));

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
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With');
  }
  
  // Si c'est une erreur CORS, retourner 403 au lieu de 500
  const statusCode = err.message && err.message.includes('CORS') ? 403 : (err.status || 500);
  
  res.status(statusCode).json({
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
});

// Initialise la connexion DB (non-bloquant pour Lambda)
connectToDB().catch(err => {
  console.error('Failed to connect to database:', err);
});

connectModels({ alter: true }).catch(err => {
  console.error('Failed to sync models:', err);
});

module.exports = app