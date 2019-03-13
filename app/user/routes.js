module.exports = function(app, config, DB, func, bcrypt, validator) {
	
	// -------------------------- Register User -------------------------- //
	app.post('/user/create', [
		validator.check('username').not().isEmpty().trim().escape(),
		validator.check('password').not().isEmpty().trim().escape(),
		validator.check('password2').not().isEmpty().trim().escape()
		.custom((value,{req, loc, path}) => { // Custom validator to check that password == password2
			if (value !== req.body.password) {throw new Error("Passwords don't match");} 
			else {return value;}
		})
	], (req, res) => {
		// On validation error
		const errors = validator.validationResult(req);
		if (!errors.isEmpty()) {
			let obj = {success: false, errors: errors.array()};
			return res.status(422).json(obj);
		}
		
		// request is formed properly
		// Hash the password
		let {username, password, password2} = req.body;
		bcrypt.hash(password, config.BCRYPT_SALT_ROUND, function(err, hash) {
			if (err) {
				obj = {success: false, errors:[err.message]};
				res.status(500).json(obj);
			}
			
			// Try to add user to DB
			let sql = "INSERT INTO User (username, password, avatar) VALUES(?, ?, '\/static\/pictures\/avatars\/default.jpg')";
			let db = DB.open();
			db.run(sql, [username, hash], function(err) {
				if (err) {
					let obj = {success: false, errors: [err.message]};
					res.status(500).json(obj);
				}
				else {
					let obj = {success: true};
					res.status(200).json(obj);
				}
			});
			DB.close();
		});
	});
	
	// -------------------------- Delete User -------------------------- //
	app.post('/user/delete', [
		validator.check('token').not().isEmpty().trim().escape(),
		validator.check('password').not().isEmpty().trim().escape()
	], (req, res) => {
		// On validation error
		const errors = validator.validationResult(req);
		if (!errors.isEmpty()) {
			let obj = {success: false, errors: errors.array()};
			return res.status(422).json(obj);
		}
		
		// Try to get the user
		let {token, password} = req.body;
		let user = func.get_token(token);
		if (user != null) {
			let sql = "SELECT * FROM User WHERE _id = ?";
			let db = DB.open();
			db.get(sql, [user._id], function(err, row) {
				// DB error
				if (err) {
					let obj = {success: false, errors:[err.message]};
					res.status(500).json(obj);
				}
					
				// No result 
				else if (row == null) {
					let obj = {success: false, errors:['User does not exist.']};
					res.status(401).json(obj);
				}
				
				// User found, test password
				else {
					bcrypt.compare(password, row.password, function(err, result, db) {
						// bcrypt error
						if (err) {
							let obj = {success: false, errors: [err.message]};
							res.status(500).json(obj);
						}
						
						// password is wrong
						else if (!(result == true)) {
							let obj = {success: false, errors:['Error in password.']};
							res.status(401).json(obj);							
						}
						
						// password is right, delete the account
						else {
							let sql = 'DELETE FROM User WHERE _id = ?';
							let db = DB.open();
							db.run(sql, [row._id], function(err) {
								if (err) {
									let obj = {success: false, errors:[err.message]};
									res.status(500).json(obj);
								}
								else {
									let obj = {success: true};
									res.status(200).json(obj);
								}
							});
						}
					});
				}
			});
			DB.close();
		} else {
			let obj = {success: false, errors:['Token error.']};
			res.status(401).json(obj);
		}
	});
	
	// -------------------------- Login -------------------------- //
	app.post('/login', [
		validator.check('username').not().isEmpty().trim().escape(),
		validator.check('password').not().isEmpty().trim().escape()
	], (req, res) => {
		// On validation error
		const errors = validator.validationResult(req);
		if (!errors.isEmpty()) {
			let obj = {success: false, errors: errors.array()};
			return res.status(422).json(obj);
		}
		
		// request is formed properly
		// checking if user exists in DB
		let {username, password} = req.body;
		let sql = "SELECT * FROM User WHERE username = ?";
		let db = DB.open();
		db.get(sql, [username], function(err, row) {
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
					else if (! result) {
						let obj = {success: false, errors:['Username or password wrong']};
						res.status(401).json(obj);							
					}
					
					// password is right, give back jwt token
					else {
						const token = func.gen_token("user", row._id);
						let obj = {success: true, token: token};
						res.status(200).json(obj);
					}
				});
			}
		});
		DB.close();
	});
	
	// -------------------------- Change password -------------------------- //
	app.post('/user/password', [
		validator.check('token').not().isEmpty().trim().escape(),
		validator.check('old').not().isEmpty().trim().escape(),
		validator.check('password').not().isEmpty().trim().escape()
	], (req, res) => {
		// On validation error
		const errors = validator.validationResult(req);
		if (!errors.isEmpty()) {
			let obj = {success: false, errors: errors.array()};
			return res.status(422).json(obj);
		}
		
		let {token, old, password} = req.body;
		let user = func.get_token(token);
		if (user != null) {
			let sql = "SELECT * FROM User WHERE _id = ?";
			let db = DB.open();
			db.get(sql, [user._id], function(err, row) {
				// DB error
				if (err) {
					let obj = {success: false, errors:[err.message]};
					res.status(500).json(obj);
				}
					
				// No result 
				else if (row == null) {
					let obj = {success: false, errors:['User does not exist.']};
					res.status(401).json(obj);
				}
				
				// User found, test password
				else {
					bcrypt.compare(old, row.password, function(err, result) {
						// bcrypt error
						if (err) {
							let obj = {success: false, errors: [err.message]};
							res.status(500).json(obj);
						}
						
						// password is wrong
						else if (! result) {
							console.log('entered right scope');
							let obj = {success: false, errors:['Error in password']};
							res.status(401).json(obj);							
						}
						
						// password is right, change it
						else {
							bcrypt.hash(password, config.BCRYPT_SALT_ROUND, function(err, hash) {
								if (err) {
									let obj = {success: false, errors:[err.message]};
									res.status(500).json(obj);
								}
								
								let db = DB.open();
								let sql = "UPDATE User SET password = ? WHERE _id = ?";
								db.run(sql, [hash, row._id], function (err) {
									if (err) {
										let obj = {success: false, errors:[err.message]};
										res.status(500).json(obj);
									}
									else {
										let obj = {success:true};
										res.status(200).json(obj);
									}
								});
							});
						}
					});
				}
				DB.close();
			});
		} else {
			let obj = {success: false, errors:['Token error.']};
			res.status(401).json(obj);
		}
	});
	
	// -------------------------- Change avatar -------------------------- //
	/*app.post('/user/avatar', [
		validator.check('token').not().isEmpty().trim().escape(),
	], (req, res) => {
		
	});*/
	
	// -------------------------- authenticate -------------------------- //
	// Test function at the moment
	app.post('/user/auth', [
		validator.check('token').not().isEmpty().trim().escape()
	], (req, res) => {
		const token = req.body.token;
		const legit = func.get_token(token);
		res.status(200).json(legit);
	});
}