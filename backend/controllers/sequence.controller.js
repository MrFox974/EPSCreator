const Sequence = require('../models/Sequence');

/**
 * Récupérer toutes les séquences d'une activité
 */
exports.getByActivite = async (req, res) => {
  try {
    const { activiteId } = req.params;
    const sequences = await Sequence.findAll({
      where: { activite_support_id: activiteId },
      order: [['created_at', 'ASC']],
    });
    res.json({ sequences });
  } catch (error) {
    console.error('Erreur lors de la récupération des séquences:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

/**
 * Récupérer une séquence par ID
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const sequence = await Sequence.findByPk(id);
    
    if (!sequence) {
      return res.status(404).json({ error: 'Séquence non trouvée' });
    }
    
    res.json({ sequence });
  } catch (error) {
    console.error('Erreur lors de la récupération de la séquence:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

/**
 * Créer une nouvelle séquence
 */
exports.create = async (req, res) => {
  try {
    const sequence = await Sequence.create(req.body);
    res.status(201).json({ sequence, message: 'Séquence créée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la création de la séquence:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

/**
 * Mettre à jour une séquence
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const sequence = await Sequence.findByPk(id);
    
    if (!sequence) {
      return res.status(404).json({ error: 'Séquence non trouvée' });
    }
    
    // Filtrer les champs non-modifiables
    const { id: _, activite_support_id, created_at, updated_at, ...updateData } = req.body;
    
    await sequence.update(updateData);
    res.json({ sequence, message: 'Séquence mise à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la séquence:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

/**
 * Supprimer une séquence
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const sequence = await Sequence.findByPk(id);
    
    if (!sequence) {
      return res.status(404).json({ error: 'Séquence non trouvée' });
    }
    
    await sequence.destroy();
    res.json({ message: 'Séquence supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la séquence:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};
