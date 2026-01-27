require('dotenv').config()

const express = require('express')
const app = express()
const { connectToDB, connectModels } = require('./config/database')
const cors = require('cors')

// Configuration CORS : accepte uniquement l'origine définie dans CORS_ORIGIN
const allowedOrigin = (process.env.CORS_ORIGIN || 'http://localhost:5173').trim();

app.use(cors({
  origin: function (origin, callback) {
    // Vérifie si l'origine correspond exactement à celle autorisée
    if (origin === allowedOrigin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-CSRF-Token']
}));

// Gestion explicite des requêtes OPTIONS (preflight) pour Lambda Function URL
app.options('*', (req, res) => {
  // Vérifie que l'origine de la requête correspond à celle autorisée
  if (req.headers.origin === allowedOrigin) {
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-CSRF-Token');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.sendStatus(200);
  } else {
    res.sendStatus(403);
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false })); 
// Ne pas toucher à extended: true, ça peut causer des problèmes avec les données de la BDD.

require('./models/Test');

app.use('/api', require('./router/test.route'))

connectToDB()

connectModels({ force: false })

module.exports = app