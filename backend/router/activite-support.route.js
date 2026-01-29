const express = require('express');
const route = express.Router();
const controller = require('../controllers/activite-support.controller');

// GET /api/activites/classe/:classeId - Récupérer les activités d'une classe
route.get('/activites/classe/:classeId', controller.getByClasse);

// GET /api/activites/:id - Récupérer une activité par ID
route.get('/activites/:id', controller.getById);

// POST /api/activites - Créer une activité
route.post('/activites', controller.create);

// PUT /api/activites/:id - Mettre à jour une activité
route.put('/activites/:id', controller.update);

// DELETE /api/activites/:id - Supprimer une activité
route.delete('/activites/:id', controller.delete);

module.exports = route;
