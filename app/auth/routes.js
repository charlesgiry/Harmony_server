module.exports = function(app, config, DB, jwt, check, validationResult, bcrypt) {
	
	// -------------------------- Register -------------------------- //
	app.post('/register', [
		check('username').not().isEmpty().trim().escape(),
		check('password').not().isEmpty().trim().escape(),
		check('password2').not().isEmpty().trim().escape()
		.custom((value,{req, loc, path}) => { // Custom validator to check that password == password2
			if (value !== req.body.password) {throw new Error("Passwords don't match");} 
			else {return value;}
		})
	], (req, res) => {
		// On validation error
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			let obj = {success: false, errors: errors.array()};
			return res.status(422).json(obj);
		}
		
		// request is formed properly
		else {
			// Hash the password async
			let {username, password, password2} = req.body;
			bcrypt.hash(password, config.BCRYPT_SALT_ROUND, function(err, hash) {
				// Try to add user to DB
				let sql = "INSERT INTO User (username, password, avatar) ";
				sql = sql + " VALUES('" + username + "', '" + hash + "', '\/static\/pictures\/avatars\/default.jpg')";
				let db = DB.open();
				db.run(sql, function(err) {
					// On error to add to DB
					if (err) {
						let obj = {success: false, errors:[err.message]};
						res.status(500).json(obj);
					}
					
					// No error, everything went well
					else {
						let obj = {success: true};
						res.status(200).json(obj)
					}
				});
				DB.close(db);
			});
		}
	});
	
	// -------------------------- Login -------------------------- //
	app.post('/login', [
		check('username').not().isEmpty().trim().escape(),
		check('password').not().isEmpty().trim().escape()
	], (req, res) => {
		// On validation error
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			let obj = {success: false, errors: errors.array()};
			return res.status(422).json(obj);
		}
		
		// request is formed properly
		else {
			// checking if user exists in DB
			let {username, password} = req.body;
			let sql = "SELECT * FROM User WHERE username == '" + username + "'";
			let db = DB.open();
			db.get(sql, function(err, row) {
				// Error on query execution
				if (err) {
					let obj = {success: false, errors:[err.message]};
					res.status(500).json(obj);
				}
				
				// No result 
				else if (row == null) {
					/* error message slighly mistaken in order not to be able to guess whether
					there was an error on username + password or if username doesn't exist */
					let obj = {success: false, errors:['Username or password wrong']};
					res.status(401).json(obj);
				}
				
				// User found, test password
				else {
					bcrypt.compare(password, row.password, function(err, result) {
						// bcrypt error
						if (err) {
							let obj = {success: false, errors: [err.message]};
							res.status(500).json(obj);
						}
						
						// password is wrong
						else if (!(result == true)) {
							let obj = {success: false, errors:['Username or password wrong']};
							res.status(401).json(obj);							
						}
						
						// password is right, give back jwt token
						else {						
							const token = jwt.sign({_id: row._id, username: row.username}, config.SECRET);
							let obj = {success: true, token: token};
							res.status(200).json(obj);
						}
					});
				}
			});
			DB.close(db);
		}
	});
	
	// -------------------------- authenticate -------------------------- //
	app.post('/auth', [
		check('token').not().isEmpty().trim().escape()
	], (req, res) => {
		const token = req.body.token;
		let legit = jwt.verify(token, config.SECRET);
		res.json(legit);
	});
}