const express = require('express');
const route = express.Router();
const controller = require('../controllers/ecole.controller');

// GET /api/ecoles - Récupérer toutes les écoles
route.get('/ecoles', controller.getAll);

// GET /api/ecoles/:id - Récupérer une école par ID
route.get('/ecoles/:id', controller.getById);

// POST /api/ecoles - Créer une école
route.post('/ecoles', controller.create);

// PUT /api/ecoles/:id - Mettre à jour une école
route.put('/ecoles/:id', controller.update);

// DELETE /api/ecoles/:id - Supprimer une école
route.delete('/ecoles/:id', controller.delete);

module.exports = route;
