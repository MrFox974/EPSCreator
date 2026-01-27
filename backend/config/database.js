const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

// Supporte à la fois les anciens noms (DB_*) et les nouveaux (DATABASE_*)
const DB_NAME = process.env.DATABASE_NAME
const DB_USER = process.env.DATABASE_USER
const DB_PASSWORD = process.env.DATABASE_PASSWORD
const DB_HOST = process.env.DATABASE_HOST || 'localhost';
const DB_PORT = process.env.DATABASE_PORT || 5432;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  logging: false,
});


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