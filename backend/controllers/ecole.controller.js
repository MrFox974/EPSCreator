const { Ecole, Classe, ActiviteSupport } = require('../models');

/**
 * Récupérer toutes les écoles avec leurs classes et activités
 */
exports.getAll = async (req, res) => {
  try {
    const ecoles = await Ecole.findAll({
      include: [{
        model: Classe,
        as: 'classes',
        include: [{
          model: ActiviteSupport,
          as: 'activites',
          attributes: ['id', 'nom', 'couleur', 'champ_apprentissage', 'created_at']
        }]
      }],
      order: [['created_at', 'DESC']],
    });
    res.json({ ecoles });
  } catch (error) {
    console.error('Erreur lors de la récupération des écoles:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

/**
 * Récupérer une école par ID
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const ecole = await Ecole.findByPk(id, {
      include: [{
        model: Classe,
        as: 'classes',
        include: [{
          model: ActiviteSupport,
          as: 'activites',
          attributes: ['id', 'nom', 'couleur', 'champ_apprentissage', 'created_at']
        }]
      }]
    });
    
    if (!ecole) {
      return res.status(404).json({ error: 'École non trouvée' });
    }
    
    res.json({ ecole });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'école:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

/**
 * Créer une nouvelle école
 */
exports.create = async (req, res) => {
  try {
    const { nom, description, couleur } = req.body;
    
    if (!nom) {
      return res.status(400).json({ error: 'Le nom est requis' });
    }
    
    const ecole = await Ecole.create({ nom, description, couleur });
    res.status(201).json({ ecole, message: 'École créée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la création de l\'école:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

/**
 * Mettre à jour une école
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const ecole = await Ecole.findByPk(id);
    
    if (!ecole) {
      return res.status(404).json({ error: 'École non trouvée' });
    }
    
    await ecole.update(req.body);
    res.json({ ecole, message: 'École mise à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'école:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

/**
 * Supprimer une école
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const ecole = await Ecole.findByPk(id);
    
    if (!ecole) {
      return res.status(404).json({ error: 'École non trouvée' });
    }
    
    // Supprimer en cascade : classes et leçons
    await Classe.destroy({ where: { ecole_id: id } });
    await ecole.destroy();
    
    res.json({ message: 'École supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'école:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};
