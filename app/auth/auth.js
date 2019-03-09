module.exports = function(app, config, db, func, check, validationResult, bcrypt) {
	require(__dirname +'/routes.js')(app, config, db, func, check, validationResult, bcrypt);
}