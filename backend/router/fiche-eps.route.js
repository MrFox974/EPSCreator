const express = require('express');
const route = express.Router();
const controller = require('../controllers/fiche-eps.controller');

// GET /api/fiche-eps - Récupérer toutes les fiches
route.get('/fiche-eps', controller.getAll);

// GET /api/fiche-eps/:id - Récupérer une fiche par ID
route.get('/fiche-eps/:id', controller.getById);

// POST /api/fiche-eps - Créer une nouvelle fiche
route.post('/fiche-eps', controller.create);

// PUT /api/fiche-eps/:id - Mettre à jour une fiche complète
route.put('/fiche-eps/:id', controller.update);

// PATCH /api/fiche-eps/:id/field - Mettre à jour un champ spécifique
route.patch('/fiche-eps/:id/field', controller.updateField);

// DELETE /api/fiche-eps/:id - Supprimer une fiche
route.delete('/fiche-eps/:id', controller.delete);

// POST /api/fiche-eps/reorder - Réordonner les leçons
route.post('/fiche-eps/reorder', controller.reorder);

module.exports = route;
