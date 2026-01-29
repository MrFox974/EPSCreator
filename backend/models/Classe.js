const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

const Classe = sequelize.define(
  'classe',
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
    niveau: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    effectif: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    ecole_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ecole',
        key: 'id',
      },
    },
  },
  {
    tableName: 'classe',
    freezeTableName: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Classe;
