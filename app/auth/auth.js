module.exports = function(app, config, db, func, check, validationResult, bcrypt) {
	console.log('Auth module loaded');
	require(__dirname +'/routes.js')(app, config, db, func, check, validationResult, bcrypt);
}