const { Sequelize } = require('sequelize');
const mysql2 = require('mysql2');
const fs = require('fs');
const path = require('path');

require('dotenv').config();


const sequelize = new Sequelize(
  process.env.DATABASE_NAME,
  process.env.DATABASE_USER,
  process.env.DATABASE_PASSWORD,
  {
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT || 3306,
    dialect: 'mysql',
    logging: false,
  }
);


const connectToDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connexion établie avec succés.');
  } catch (error) {
    console.error('Impossible de se connecter à la base de données:', error);
  }
};

const connectModels = async (force) => {
    try{
        await sequelize.sync(force);
        console.log('All models were synchronized successfully.');
    }catch(error){
        console.error('Impossible de synchroniser les models :', error);
    }
}



module.exports = { sequelize, connectToDB, connectModels }