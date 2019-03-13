module.exports = function(app, config, db, func, bcrypt, validator) {
	console.log('User module loaded');
	require(__dirname +'/routes.js')(app, config, db, func, bcrypt, validator);
}