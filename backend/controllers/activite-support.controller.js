const { ActiviteSupport, FicheEPS, Classe, Ecole, Sequence } = require('../models');
const leconPdfService = require('../services/pdf/lecon-pdf.service');
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
          attributes: ['id', 'titre', 'lecon_numero', 'ordre', 'date', 'created_at'],
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

/**
 * Télécharger un ZIP avec tous les documents d'une activité :
 * - PDFs de toutes les leçons
 * - PDF Références de la séquence
 * - PDF Projet de séquence
 *
 * GET /api/activites/:id/documents.zip
 */
exports.downloadDocumentsZip = async (req, res) => {
  try {
    const { id } = req.params;

    const activite = await ActiviteSupport.findByPk(id, {
      include: [
        {
          model: FicheEPS,
          as: 'lecons',
          attributes: ['id', 'titre', 'lecon_numero', 'ordre', 'date', 'created_at', 'updated_at'],
        },
        {
          model: Classe,
          as: 'classe',
          include: [{ model: Ecole, as: 'ecole' }],
        },
      ],
      order: [[{ model: FicheEPS, as: 'lecons' }, 'ordre', 'ASC']],
    });

    if (!activite) {
      return res.status(404).json({ error: 'Activité non trouvée' });
    }

    const sequences = await Sequence.findAll({
      where: { activite_support_id: id },
      order: [['created_at', 'ASC']],
    });

    const { default: Archiver } = await import('archiver');
    const archive = Archiver('zip', { zlib: { level: 9 } });

    const zipName = `documents_${safeFileBaseName(activite.nom, `activite_${id}`)}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

    archive.on('warning', (err) => {
      console.warn('ZIP warning:', err);
    });
    archive.on('error', (err) => {
      console.error('ZIP error:', err);
      throw err;
    });

    archive.pipe(res);

    const toZipBuffer = (data) => {
      if (!data) return Buffer.from('');
      if (Buffer.isBuffer(data)) return data;
      // Puppeteer peut renvoyer Uint8Array selon la version
      if (data instanceof Uint8Array) return Buffer.from(data);
      // Dernier recours (évite de casser le ZIP)
      return Buffer.from(String(data));
    };

    // 1) Leçons (PDF)
    const lecons = Array.isArray(activite.lecons) ? activite.lecons : [];
    for (const fiche of lecons) {
      const ficheJson = fiche.toJSON ? fiche.toJSON() : fiche;
      const pdfBuffer = await leconPdfService.generateFicheEpsPdfBuffer(ficheJson);
      const base = safeFileBaseName(`lecon_${ficheJson.lecon_numero || ficheJson.id}_${ficheJson.titre || ''}`, `lecon_${ficheJson.id}`);
      archive.append(toZipBuffer(pdfBuffer), { name: `lecons/${base}.pdf` });
    }

    // 2) Séquence(s) : Références + Projet (PDF)
    for (const seq of sequences) {
      const seqJson = seq.toJSON ? seq.toJSON() : seq;
      const seqBase = safeFileBaseName(`sequence_${seqJson.id}_${seqJson.titre || ''}`, `sequence_${seqJson.id}`);

      const pdfRef = await sequencePdfService.generateSequenceReferencesPdfBuffer(seqJson, activite.toJSON ? activite.toJSON() : activite);
      archive.append(toZipBuffer(pdfRef), { name: `sequences/${seqBase}_references.pdf` });

      const pdfProjet = await sequencePdfService.generateSequenceProjetPdfBuffer(seqJson, activite.toJSON ? activite.toJSON() : activite);
      archive.append(toZipBuffer(pdfProjet), { name: `sequences/${seqBase}_projet.pdf` });
    }

    // Si aucune séquence, ajouter un petit fichier pour éviter un ZIP "vide" côté séquences
    if (!sequences || sequences.length === 0) {
      archive.append('Aucune séquence pour cette activité.\n', { name: 'sequences/README.txt' });
    }

    await archive.finalize();
  } catch (error) {
    console.error('Erreur génération ZIP documents activité:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Erreur serveur', details: error.message });
    }
    // si déjà en streaming, on ne peut plus répondre proprement
  }
};
