const jwt = require('jsonwebtoken')
const config = require('../config/app')


exports.auth = (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if(!token) {
        return res.status(401).json({error: 'Missing Token'})
    }


    //validate token

    jwt.verify(token, config.appKey, (err, user) => {
        if(err) {
            return res.status(401).json({ error: err })
        }

        //to use user in controller and we know whos updating
        req.user = user

        console.log(user)
    })



    next()
}