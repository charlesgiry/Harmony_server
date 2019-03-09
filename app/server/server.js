module.exports = function(app, db, func, check, validationResult) {
	console.log('Server module loaded');
	require(__dirname +'/routes.js')(app, db, func, check, validationResult);
}