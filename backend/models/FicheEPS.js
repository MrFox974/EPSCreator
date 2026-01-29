const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

const FicheEPS = sequelize.define(
  'fiche_eps',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    // Relation avec Activité Support
    activite_support_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'activite_support',
        key: 'id',
      },
    },
    // Ordre d'affichage
    ordre: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    // En-tête
    titre: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: 'Préparation leçon EPS',
    },
    bandeau_titre: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: 'ENSEIGNER LE DEMI-FOND : GERER SON ALLURE AVEC REPRES EXTERNES',
    },
    objet_enseignement: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '« Adopter, maintenir et réguler une intensité d\'allure adaptée au(x) temps de course(s) choisi(s) de l\'épreuve pour réaliser la meilleure performance possible »',
    },
    // Badges
    lecon_numero: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '4',
    },
    apsa: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: 'Demi-fond',
    },
    classe: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: 'Demi-fond',
    },
    effectif: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '27',
    },
    // Accroche programme
    champs_apprentissage: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '• CA 1 : Produire une performance mesurable à une échéance donnée',
    },
    competences_attendues: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '• Adapter sa course à des repères extérieurs\n• Persévérer pour maintenir son allure de course régulière',
    },
    // Contenus de la leçon
    intension_pedagogique: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '• Adapter sa course à des repères extérieurs',
    },
    intension_educatif: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '• Adapter sa course à des repères extérieurs',
    },
    objectif_enseignante: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '• Adapter sa course à des repères extérieurs',
    },
    objectif_eleve: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '• Adapter sa course à des repères extérieurs',
    },
    quoi_ciblage: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '• Connaissance',
    },
    comment_enseignement: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '• Adapter sa course à des repères extérieurs\n• Persévérer pour maintenir son allure de course régulière',
    },
    // Sécurité
    points_securite: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '• Adapter sa course à des repères extérieurs',
    },
    // Déroulement
    situations_apprentissages: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '• SA 1 :',
    },
    generale: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '• SA 2 :',
    },
    // Régulations
    observations_attendues: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '• SA * :',
    },
    regulation: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '• SA 2 :',
    },
    // Situations - Echauffement
    echauffement_but: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '',
    },
    echauffement_consigne: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '',
    },
    echauffement_criteres_reussite: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '',
    },
    echauffement_criteres_realisation: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '',
    },
    echauffement_amenagement: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '',
    },
    // Situations - Apprentissage
    apprentissage_but: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '',
    },
    apprentissage_consigne: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '',
    },
    apprentissage_criteres_reussite: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '',
    },
    apprentissage_criteres_realisation: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '',
    },
    apprentissage_amenagement: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '',
    },
    // Situations - Finale
    finale_but: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '',
    },
    finale_consigne: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '',
    },
    finale_criteres_reussite: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '',
    },
    finale_criteres_realisation: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '',
    },
    finale_amenagement: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '',
    },
    // Situations dynamiques (tableaux JSON)
    situations_echauffement: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '[{"but":"","consigne":"","criteres_reussite":"","criteres_realisation":"","amenagement":""}]',
    },
    situations_apprentissage: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '[{"but":"","consigne":"","criteres_reussite":"","criteres_realisation":"","amenagement":""}]',
    },
    situations_finale: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '[{"but":"","consigne":"","criteres_reussite":"","criteres_realisation":"","amenagement":""}]',
    },
    // Rangement + Bilan (stocké en JSON pour flexibilité)
    rangement_bilan: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '{}',
    },
  },
  {
    tableName: 'fiche_eps',
    freezeTableName: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = FicheEPS;
