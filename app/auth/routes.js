module.exports = function(app, config, DB, func, check, validationResult, bcrypt) {
	
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
				// bcrypt error
				if (err) {
					obj = {success: false, errors:[err.message]};
					res.status(500).json(obj);
				}
				
				// Try to add user to DB
				let sql = "INSERT INTO User (username, password, avatar) ";
				sql = sql + " VALUES('" + username + "', '" + hash + "', '\/static\/pictures\/avatars\/default.jpg')";
				let db = DB.open();
				db.run(sql);
				DB.close(db);
				let obj = {success: true};
				res.status(200).json(obj);
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
							console.log(row);
							const token = func.gen_token(row._id, row.username);
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
		const legit = func.get_token(token);
		res.status(200).json(legit);
	});
	
	// -------------------------- change password -------------------------- //
	app.post('/user/changepassword', [
		check('token').not().isEmpty().trim().escape(),
		check('old').not().isEmpty().trim().escape(),
		check('password').not().isEmpty().trim().escape()
	], (req, res) => {
		// On validation error
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			let obj = {success: false, errors: errors.array()};
			return res.status(422).json(obj);
		}
		
		let {token, old, password} = req.body;
		let user = func.get_token(token);
		let sql = "SELECT * FROM User WHERE _id == " + user._id;
		let db = DB.open();
		db.get(sql, function(err, row) {
			// DB error
			if (err) {
				let obj = {success: false, errors:[err.message]};
				res.status(500).json(obj);
			}
				
			// No result 
			else if (row == null) {
				let obj = {success: false, errors:['Unknown error, please retry later.']};
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
					else if (!(result == true)) {
						let obj = {success: false, errors:['Unknown error, please retry later.']};
						res.status(401).json(obj);							
					}
					
					// password is right, change it
					else {
						bcrypt.hash(password, config.BCRYPT_SALT_ROUND, function(err, hash) {
							if (err) {
								obj = {success: false, errors:[err.message]};
								res.status(500).json(obj);
							}
							
							let db = DB.open();
							let sql = "UPDATE User SET password = '" + hash + "' WHERE _id == " + row._id;
							db.run(sql);
							DB.close(db);
							let obj = {success:true};
							res.status(200).json(obj);
						});
					}
				});
			}
			DB.close(db);
		});
	});
	
	// -------------------------- delete user -------------------------- //
	app.post('/delete/user', [
		check('token').not().isEmpty().trim().escape(),
		check('password').not().isEmpty().trim().escape()
	], (req, res) => {
		// On validation error
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			let obj = {success: false, errors: errors.array()};
			return res.status(422).json(obj);
		}
		
		// Try to get the user
		let {token, password} = req.body;
		let user = func.get_token(token);
		let sql = "SELECT * FROM User WHERE _id == " + user._id;
		let db = DB.open();
		db.get(sql, function(err, row) {
			// DB error
			if (err) {
				let obj = {success: false, errors:[err.message]};
				res.status(500).json(obj);
			}
				
			// No result 
			else if (row == null) {
				let obj = {success: false, errors:['Unknown error, please retry later.']};
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
						let obj = {success: false, errors:['Unknown error, please retry later.']};
						res.status(401).json(obj);							
					}
					
					// password is right, delete the account
					else {
						let sql = 'DELETE FROM User WHERE _id == ' + row._id;
						let db = DB.open();
						db.run(sql);
						DB.close(db);
						let obj = {success: true};
						res.status(200).json(obj);
						
					}
				});
			}
		});
		DB.close(db);
	});
}