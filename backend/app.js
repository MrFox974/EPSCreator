  const express = require('express')
  const app = express()
  const { connectToDB, connectModels } = require('./config/database')
  const cors = require('cors')


  app.use(cors({
    origin: [
    	process.env.PROTOCOLE + "://" + process.env.CLIENT_IP 
  	],
    credentials: true,
    methods: ['GET','POST','PUT','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization','X-CSRF-Token']
  }));

  // 

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));


  require('dotenv').config()


  require('./models/test');


  app.use('/api', require('./Router/test.route'))


  connectToDB()

  connectModels({ force: false })
  
  module.exports = app