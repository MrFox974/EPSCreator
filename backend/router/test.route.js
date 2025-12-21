const express = require('express')
const route = express.Router()
const { authMiddlewares } = require('../middlewares/authMiddlewares')

const testController = require('../Controllers/test.controller')


route.get('/test/getTest', testController.getTest)



route.post('/test/postTest' ,testController.postTest)

route.post('/test/middlerwareTest', authMiddlewares ,testController.postTest)





module.exports = route