const { ActiviteSupport, FicheEPS, Classe, Ecole } = require('../models');

/**
 * Récupérer toutes les activités d'une classe
 */
exports.getByClasse = async (req, res) => {
  try {
    const { classeId } = req.params;
    const activites = await ActiviteSupport.findAll({
      where: { classe_id: classeId },
      include: [{
        model: FicheEPS,
        as: 'lecons',
        attributes: ['id', 'titre', 'lecon_numero', 'created_at']
      }],
      order: [['created_at', 'DESC']],
    });
    res.json({ activites });
  } catch (error) {
    console.error('Erreur lors de la récupération des activités:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

/**
 * Récupérer une activité par ID avec ses leçons et infos de la classe/école
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const activite = await ActiviteSupport.findByPk(id, {
      include: [
        {
          model: FicheEPS,
          as: 'lecons',
          attributes: ['id', 'titre', 'lecon_numero', 'ordre', 'created_at'],
          order: [['ordre', 'ASC'], ['created_at', 'ASC']]
        },
        {
          model: Classe,
          as: 'classe',
          include: [{
            model: Ecole,
            as: 'ecole'
          }]
        }
      ],
      order: [[{ model: FicheEPS, as: 'lecons' }, 'ordre', 'ASC']]
    });
    
    if (!activite) {
      return res.status(404).json({ error: 'Activité non trouvée' });
    }
    
    res.json({ activite });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'activité:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

/**
 * Créer une nouvelle activité
 */
exports.create = async (req, res) => {
  try {
    const { nom, description, champ_apprentissage, couleur, classe_id } = req.body;
    
    if (!nom || !classe_id) {
      return res.status(400).json({ error: 'Le nom et la classe sont requis' });
    }
    
    const activite = await ActiviteSupport.create({ 
      nom, 
      description, 
      champ_apprentissage, 
      couleur, 
      classe_id 
    });
    res.status(201).json({ activite, message: 'Activité créée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la création de l\'activité:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

/**
 * Mettre à jour une activité
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const activite = await ActiviteSupport.findByPk(id);
    
    if (!activite) {
      return res.status(404).json({ error: 'Activité non trouvée' });
    }
    
    await activite.update(req.body);
    res.json({ activite, message: 'Activité mise à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'activité:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

/**
 * Supprimer une activité
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const activite = await ActiviteSupport.findByPk(id);
    
    if (!activite) {
      return res.status(404).json({ error: 'Activité non trouvée' });
    }
    
    // Supprimer les leçons associées
    await FicheEPS.destroy({ where: { activite_support_id: id } });
    await activite.destroy();
    
    res.json({ message: 'Activité supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'activité:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};
