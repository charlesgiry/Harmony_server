const jwt = require('jsonwebtoken');
const config = require('../config/config.json');

module.exports = {
	// Generate a jwt session token
	gen_token: function(type, id) {
		const token = jwt.sign({type: type,_id: id}, config.SECRET);
		return token;
	},
	
	// Return unencrypted token content (or null if token is wrong)
	get_token: function(token) {
		try {
			const obj = jwt.verify(token, config.SECRET);
			return obj;
		} catch(e) {
			var obj;
			return obj;
		}
	},
}