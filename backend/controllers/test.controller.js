const bcrypt = require('bcryptjs')
const Test = require('../models/Test')
const jwt = require('jsonwebtoken');
const cookie = require("cookie-parser")



exports.getTest = async (req, res) => {

    res.json({ response: 200})


}

exports.postTest = async (req, res) => {

    const { test, password } = req.body

    // const existUser = await Test.findOne({
    //     where: {
    //         id: 1
    //     }
    // })

    try{
        const existUser = await Test.create({
            user_id: 60,
            email: "newtest",
            password: "savedPassword"
        })
        res.json({ test: existUser})
    }catch(e){
        console.log('erreur : ' + e)
    }
      

    


}
