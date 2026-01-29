const express = require('express');
const route = express.Router();
const controller = require('../controllers/classe.controller');

// GET /api/classes/ecole/:ecoleId - Récupérer les classes d'une école
route.get('/classes/ecole/:ecoleId', controller.getByEcole);

// GET /api/classes/:id - Récupérer une classe par ID
route.get('/classes/:id', controller.getById);

// POST /api/classes - Créer une classe
route.post('/classes', controller.create);

// PUT /api/classes/:id - Mettre à jour une classe
route.put('/classes/:id', controller.update);

// DELETE /api/classes/:id - Supprimer une classe
route.delete('/classes/:id', controller.delete);

module.exports = route;
