const express = require('express');
require('dotenv').config()
const config = require('./config/app');
const bodyParser = require('body-parser')
const cors = require('cors')


const app = express();

app.use(cors())
app.use(bodyParser.urlencoded({ extended: true}));
app.use(bodyParser.json());
const router = require('./router/index');
const port = config.appPort


app.use(router)
app.listen(port, () => {
    console.log(`server listening in port ${port}`);
})

