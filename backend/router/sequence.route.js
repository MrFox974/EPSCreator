const express = require('express');
const route = express.Router();
const controller = require('../controllers/sequence.controller');

// GET /api/sequences/activite/:activiteId - Récupérer les séquences d'une activité
route.get('/sequences/activite/:activiteId', controller.getByActivite);

// GET /api/sequences/:id - Récupérer une séquence par ID
route.get('/sequences/:id', controller.getById);

// GET /api/sequences/:id/pdf/references - Télécharger PDF Références
route.get('/sequences/:id/pdf/references', controller.getReferencesPdfById);

// GET /api/sequences/:id/pdf/projet - Télécharger PDF Projet
route.get('/sequences/:id/pdf/projet', controller.getProjetPdfById);

// POST /api/sequences - Créer une nouvelle séquence
route.post('/sequences', controller.create);

// PUT /api/sequences/:id - Mettre à jour une séquence
route.put('/sequences/:id', controller.update);

// DELETE /api/sequences/:id - Supprimer une séquence
route.delete('/sequences/:id', controller.delete);

module.exports = route;
