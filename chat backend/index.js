const express = require('express');
require('dotenv').config()
const config = require('./config/app');
const bodyParser = require('body-parser')
const cors = require('cors')
const http = require('http')
const app = express();



// app.use(function(req, res, next) {
//     res.header("Access-Control-Allow-Origin", "*");
//     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//     next();
//   });

app.use(cors())
app.use(bodyParser.urlencoded({ extended: true}));
app.use(bodyParser.json());

app.use(express.static(__dirname + '/public'))
app.use(express.static(__dirname + '/uploads'))


const router = require('./router/index');
const port = config.appPort

const server = http.createServer(app)
const SocketServer = require('./socket/index')
SocketServer(server)


app.use(router)
server.listen(port, () => {
    console.log(`server listening in port ${port}`);
})

