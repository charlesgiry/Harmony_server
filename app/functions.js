const jwt = require('jsonwebtoken');
const config = require('../config/config.json');

module.exports = {
	gen_token: function(id, username) {
		const token = jwt.sign({_id: id, username: username}, config.SECRET);
		return token;
	},
	
	get_token: function(token) {
		const user = jwt.verify(token, config.SECRET);
		return user;
	}
}