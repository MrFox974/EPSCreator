  const express = require('express')
  const app = express()
  const { connectToDB, connectModels } = require('./config/database')
  const cors = require('cors')


  app.use(cors({
    origin: [
    	process.env.PROTOCOLE + "://" + process.env.CLIENT_IP + ":" + process.env.CLIENT_PORT
  	],
    credentials: true,
    methods: ['GET','POST','PUT','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization','X-CSRF-Token']
  }));

  // 

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));


  require('dotenv').config()


  require('./models/Test');


  app.use('/api', require('./Router/test.route'))


  connectToDB()

  connectModels({ force: false })
  
  module.exports = app