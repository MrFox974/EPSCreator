const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

const ActiviteSupport = sequelize.define(
  'activite_support',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nom: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    champ_apprentissage: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    couleur: {
      type: DataTypes.STRING(7),
      allowNull: true,
      defaultValue: '#5dade2',
    },
    classe_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'classe',
        key: 'id',
      },
    },
  },
  {
    tableName: 'activite_support',
    freezeTableName: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = ActiviteSupport;
