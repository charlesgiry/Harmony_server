module.exports = function(app, db, func, validator) {
	console.log('Server module loaded');
	require(__dirname +'/routes.js')(app, db, func, validator);
}