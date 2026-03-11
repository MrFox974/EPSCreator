const Sequence = require('../models/Sequence');
const { ActiviteSupport, Classe, Ecole } = require('../models');
const sequencePdfService = require('../services/pdf/sequence-pdf.service');

function safeFileBaseName(input, fallback = 'document') {
  const raw = String(input || '').trim() || fallback;
  return raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || fallback;
}

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

/**
 * Télécharger le PDF Références de la séquence
 * GET /api/sequences/:id/pdf/references
 */
exports.getReferencesPdfById = async (req, res) => {
  try {
    const { id } = req.params;
    const sequence = await Sequence.findByPk(id);
    if (!sequence) return res.status(404).json({ error: 'Séquence non trouvée' });

    const sequenceJson = sequence.toJSON();

    let activite = null;
    if (sequenceJson.activite_support_id) {
      activite = await ActiviteSupport.findByPk(sequenceJson.activite_support_id, {
        include: [{ model: Classe, as: 'classe', include: [{ model: Ecole, as: 'ecole' }] }],
      });
    }
    const activiteJson = activite ? (activite.toJSON ? activite.toJSON() : activite) : null;

    const pdf = await sequencePdfService.generateSequenceReferencesPdfBuffer(sequenceJson, activiteJson);
    const buf = Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);

    const safeName = safeFileBaseName(`references_${sequenceJson.id}_${sequenceJson.titre || ''}`, `references_${sequenceJson.id}`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
    return res.status(200).send(buf);
  } catch (error) {
    console.error('Erreur génération PDF références séquence:', error);
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

/**
 * Télécharger le PDF Projet de séquence
 * GET /api/sequences/:id/pdf/projet
 */
exports.getProjetPdfById = async (req, res) => {
  try {
    const { id } = req.params;
    const sequence = await Sequence.findByPk(id);
    if (!sequence) return res.status(404).json({ error: 'Séquence non trouvée' });

    const sequenceJson = sequence.toJSON();

    let activite = null;
    if (sequenceJson.activite_support_id) {
      activite = await ActiviteSupport.findByPk(sequenceJson.activite_support_id, {
        include: [{ model: Classe, as: 'classe', include: [{ model: Ecole, as: 'ecole' }] }],
      });
    }
    const activiteJson = activite ? (activite.toJSON ? activite.toJSON() : activite) : null;

    const pdf = await sequencePdfService.generateSequenceProjetPdfBuffer(sequenceJson, activiteJson);
    const buf = Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);

    const safeName = safeFileBaseName(`projet_${sequenceJson.id}_${sequenceJson.titre || ''}`, `projet_${sequenceJson.id}`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
    return res.status(200).send(buf);
  } catch (error) {
    console.error('Erreur génération PDF projet séquence:', error);
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};
