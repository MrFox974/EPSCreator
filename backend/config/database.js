const { Sequelize } = require('sequelize');
const mysql2 = require('mysql2');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const caPath = path.resolve(__dirname, '..', process.env.DB_CA_PATH);

const ca = fs.readFileSync(caPath, 'utf8');

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

  console.log(process.env.DB_CA_PATH)

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