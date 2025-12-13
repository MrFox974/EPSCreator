const express = require('express')
const route = express.Router()
const { authMiddlewares } = require('../middlewares/authMiddlewares')

const testController = require('../Controllers/test.controller')


route.post('/test/getTest', testController.getTest)
route.post('/test/getTest', authMiddlewares ,testController.getTest)






module.exports = route