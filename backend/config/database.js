const { Sequelize } = require('sequelize');
const color = require("../utils/color-message")
const mysql2 = require('mysql2');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    dialectOptions: {
      ssl: {
        rejectUnauthorized: false
      }
    }
  }
);


const connectToDB = async () => {

  try {
    await sequelize.authenticate();
    console.log(color.green + 'Connexion établie avec succés.' + color.reset);
  } catch (error) {
    console.error(color.yellow + 'Impossible de se connecter à la base de données' + color.reset);
  }
};

const connectModels = async (force) => {
    try{
        await sequelize.sync(force);
        console.log(color.green + 'All models were synchronized successfully.' + color.reset);
    }catch(error){
        console.error(color.yellow + 'Impossible de synchroniser les models' + color.reset);
    }
}



module.exports = { sequelize, connectToDB, connectModels }