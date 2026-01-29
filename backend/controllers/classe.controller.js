const { Classe, ActiviteSupport, FicheEPS } = require('../models');

/**
 * Récupérer toutes les classes d'une école
 */
exports.getByEcole = async (req, res) => {
  try {
    const { ecoleId } = req.params;
    const classes = await Classe.findAll({
      where: { ecole_id: ecoleId },
      include: [{
        model: ActiviteSupport,
        as: 'activites',
        attributes: ['id', 'nom', 'couleur', 'champ_apprentissage', 'created_at']
      }],
      order: [['created_at', 'DESC']],
    });
    res.json({ classes });
  } catch (error) {
    console.error('Erreur lors de la récupération des classes:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

/**
 * Récupérer une classe par ID
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const classe = await Classe.findByPk(id, {
      include: [{
        model: ActiviteSupport,
        as: 'activites',
        attributes: ['id', 'nom', 'couleur', 'champ_apprentissage', 'created_at']
      }]
    });
    
    if (!classe) {
      return res.status(404).json({ error: 'Classe non trouvée' });
    }
    
    res.json({ classe });
  } catch (error) {
    console.error('Erreur lors de la récupération de la classe:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

/**
 * Créer une nouvelle classe
 */
exports.create = async (req, res) => {
  try {
    const { nom, niveau, effectif, ecole_id } = req.body;
    
    if (!nom || !ecole_id) {
      return res.status(400).json({ error: 'Le nom et l\'école sont requis' });
    }
    
    const classe = await Classe.create({ nom, niveau, effectif, ecole_id });
    res.status(201).json({ classe, message: 'Classe créée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la création de la classe:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

/**
 * Mettre à jour une classe
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const classe = await Classe.findByPk(id);
    
    if (!classe) {
      return res.status(404).json({ error: 'Classe non trouvée' });
    }
    
    await classe.update(req.body);
    res.json({ classe, message: 'Classe mise à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la classe:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

/**
 * Supprimer une classe
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const classe = await Classe.findByPk(id);
    
    if (!classe) {
      return res.status(404).json({ error: 'Classe non trouvée' });
    }
    
    // Supprimer les leçons associées
    await FicheEPS.destroy({ where: { classe_id: id } });
    await classe.destroy();
    
    res.json({ message: 'Classe supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la classe:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};
