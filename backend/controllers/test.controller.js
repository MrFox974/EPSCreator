const Users = require('../models/Test')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken');
const cookie = require("cookie-parser")



exports.getTest = async (req, res) => {

    const { test, password } = req.body

    const existUser = await Test.findOne({
        where: {
            test: test
        }
    })

    res.json({ test: existUser})


}

