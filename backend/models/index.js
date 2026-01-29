/**
 * Index des modèles - Définition des associations
 */
const Ecole = require('./Ecole');
const Classe = require('./Classe');
const ActiviteSupport = require('./ActiviteSupport');
const FicheEPS = require('./FicheEPS');
const Sequence = require('./Sequence');

// Associations Ecole <-> Classe
Ecole.hasMany(Classe, { foreignKey: 'ecole_id', as: 'classes' });
Classe.belongsTo(Ecole, { foreignKey: 'ecole_id', as: 'ecole' });

// Associations Classe <-> ActiviteSupport
Classe.hasMany(ActiviteSupport, { foreignKey: 'classe_id', as: 'activites' });
ActiviteSupport.belongsTo(Classe, { foreignKey: 'classe_id', as: 'classe' });

// Associations ActiviteSupport <-> FicheEPS (Leçon)
ActiviteSupport.hasMany(FicheEPS, { foreignKey: 'activite_support_id', as: 'lecons' });
FicheEPS.belongsTo(ActiviteSupport, { foreignKey: 'activite_support_id', as: 'activiteSupport' });

// Associations ActiviteSupport <-> Sequence
ActiviteSupport.hasMany(Sequence, { foreignKey: 'activite_support_id', as: 'sequences' });
Sequence.belongsTo(ActiviteSupport, { foreignKey: 'activite_support_id', as: 'activiteSupport' });

module.exports = {
  Ecole,
  Classe,
  ActiviteSupport,
  FicheEPS,
  Sequence,
};
