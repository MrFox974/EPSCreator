const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

const Ecole = sequelize.define(
  'ecole',
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
    couleur: {
      type: DataTypes.STRING(7),
      allowNull: true,
      defaultValue: '#1e3a5f',
    },
  },
  {
    tableName: 'ecole',
    freezeTableName: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Ecole;
