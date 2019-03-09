const bcrypt = require('bcrypt');

module.exports = function(app, config, db, jwt, check, validationResult) {
	require(__dirname +'/routes.js')(app, config, db, jwt, check, validationResult, bcrypt);
}