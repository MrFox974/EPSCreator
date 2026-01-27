require('dotenv').config()

// Trigger CI/CD: minor non-functional change
const express = require('express')
const app = express()
const { connectToDB, connectModels } = require('./config/database')
const cors = require('cors')

// Configuration CORS : accepte plusieurs origines (local + prod)
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(origin => origin.trim());

app.use(cors({
  origin: function (origin, callback) {
    // Permet les requêtes sans origine (ex: Postman, mobile apps)
    if (!origin) {
      return callback(null, true);
    }
    // Vérifie si l'origine est autorisée
    if (allowedOrigins.includes(origin)) {
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
  res.header('Access-Control-Allow-Origin', req.headers.origin || allowedOrigins[0]);
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-CSRF-Token');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

app.use(express.json());
app.use(express.urlencoded({ extended: false })); 
// Ne pas toucher à extended: true, ça peut causer des problèmes avec les données de la BDD.

require('./models/Test');

app.use('/api', require('./router/test.route'))

connectToDB()

connectModels({ force: false })

module.exports = app