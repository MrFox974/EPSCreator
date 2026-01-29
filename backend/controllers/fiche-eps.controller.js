const FicheEPS = require('../models/FicheEPS');

/**
 * Récupérer toutes les fiches EPS
 */
exports.getAll = async (req, res) => {
  try {
    const fiches = await FicheEPS.findAll({
      order: [['id', 'DESC']],
    });
    res.json({ fiches });
  } catch (error) {
    console.error('Erreur lors de la récupération des fiches:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

/**
 * Récupérer une fiche EPS par ID
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const fiche = await FicheEPS.findByPk(id);
    
    if (!fiche) {
      return res.status(404).json({ error: 'Fiche non trouvée' });
    }
    
    res.json({ fiche });
  } catch (error) {
    console.error('Erreur lors de la récupération de la fiche:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

/**
 * Créer une nouvelle fiche EPS
 */
exports.create = async (req, res) => {
  try {
    const fiche = await FicheEPS.create(req.body);
    res.status(201).json({ fiche, message: 'Fiche créée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la création de la fiche:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

/**
 * Mettre à jour une fiche EPS
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const fiche = await FicheEPS.findByPk(id);
    
    if (!fiche) {
      return res.status(404).json({ error: 'Fiche non trouvée' });
    }
    
    await fiche.update(req.body);
    res.json({ fiche, message: 'Fiche mise à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la fiche:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

/**
 * Supprimer une fiche EPS
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const fiche = await FicheEPS.findByPk(id);
    
    if (!fiche) {
      return res.status(404).json({ error: 'Fiche non trouvée' });
    }
    
    await fiche.destroy();
    res.json({ message: 'Fiche supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la fiche:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

/**
 * Mettre à jour un champ spécifique d'une fiche EPS
 */
exports.updateField = async (req, res) => {
  try {
    const { id } = req.params;
    const { field, value } = req.body;
    
    if (!field) {
      return res.status(400).json({ error: 'Le champ "field" est requis' });
    }
    
    const fiche = await FicheEPS.findByPk(id);
    
    if (!fiche) {
      return res.status(404).json({ error: 'Fiche non trouvée' });
    }
    
    // Vérifier que le champ existe dans le modèle
    if (!(field in fiche.dataValues)) {
      return res.status(400).json({ error: `Le champ "${field}" n'existe pas` });
    }
    
    await fiche.update({ [field]: value });
    res.json({ fiche, message: 'Champ mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du champ:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

/**
 * Réordonner les leçons
 * Body: { orderedIds: [id1, id2, id3, ...] }
 */
exports.reorder = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    
    if (!orderedIds || !Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'orderedIds est requis et doit être un tableau' });
    }
    
    // Mettre à jour l'ordre de chaque fiche
    const updates = orderedIds.map((id, index) => 
      FicheEPS.update({ ordre: index }, { where: { id } })
    );
    
    await Promise.all(updates);
    
    res.json({ message: 'Ordre mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la réorganisation:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};
