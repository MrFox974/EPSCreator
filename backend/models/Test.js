const { sequelize }  = require('../config/database')
const { DataTypes } = require('sequelize')

const Test = sequelize.define(
  'test',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
    },
    email: {
      type: DataTypes.TEXT,
    },
    password: {
      type: DataTypes.TEXT,
    },
    domain_priority: {
      type: DataTypes.INTEGER,
    },
    domain_id: {
      type: DataTypes.INTEGER,
    },

  },
  {
    tableName: 'test',      // nom EXACT de la table dans RDS
    freezeTableName: true,   // empêche Sequelize de mettre un "s" ou de changer la casse
    timestamps: false,
  },
); 


module.exports = Test