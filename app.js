// Loading npm modules
const express = require('express');
const app = express();
const fs = require('fs');
const https = require('https');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const morgan = require('morgan');
const {check, validationResult} = require('express-validator/check');

// application settings
const config = require(__dirname +'/config/config.json');
app.use('/static', express.static(__dirname + '/app/static'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(helmet());
app.use(morgan('dev'));

// User modules
const DB = require(__dirname +'/app/db/db.js');
const auth = require(__dirname + '/app/auth/auth.js')(app, config, DB, jwt, check, validationResult);

// Start server
https.createServer({
  key: fs.readFileSync(__dirname + '/config/server.key'),
  cert: fs.readFileSync(__dirname + '/config/server.cert')
}, app)
.listen(3000, function () {
  console.log('app listening on port *:3000')
})