const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Modèle Sequence - Projet de séquence EPS
 */
const Sequence = sequelize.define('sequence', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  // Relation avec Activité Support
  activite_support_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'activite_support',
      key: 'id',
    },
  },
  // En-tête
  titre: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: 'Projet de séquence',
  },
  periode: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
  // Socle commun (JSON array de domaines)
  socle_commun: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '[]',
  },
  // Projet d'établissement
  projet_etablissement: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
  // Projet EPS
  projet_eps_axe_prioritaire: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
  projet_eps_axe_secondaire: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
  // Attendus de fin de cycle (JSON array)
  attendus_fin_cycle: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '[]',
  },
  // Projet de classe - Axes de transformation
  projet_classe_moteur: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
  projet_classe_methodologique: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
  projet_classe_sociale: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
  // Caractéristiques des élèves
  caracteristiques_eleves: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
  // Conditions d'enseignement
  conditions_enseignement: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
  // Situation d'observation / Évaluation diagnostique
  situation_observation: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
  // Comportements observés
  comportements_observes: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
  // Hypothèses explicatives
  hypotheses_explicatives: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
  // Tableau des leçons (JSON array avec descriptions par leçon)
  tableau_lecons: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '[]',
  },
  // Mode de groupement
  mode_groupement: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
  // Rôles
  roles: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
}, {
  tableName: 'sequence',
  freezeTableName: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Sequence;
