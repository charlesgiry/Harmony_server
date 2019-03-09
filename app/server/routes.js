module.exports = function(app, DB, func, check, validationResult) {
	
	// -------------------------- Create Server -------------------------- //
	app.post('/server/create',  [
		check('token').not().isEmpty().trim().escape(),
		check('servername').not().isEmpty().trim().escape()
	], (req, res) => {
		// On validation error
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			let obj = {success: false, errors: errors.array()};
			return res.status(422).json(obj);
		}
		
		// Request is formed properly
		let {token, servername} = req.body;
		let user = func.get_token(token);
		if (user != null) {
			// Insert Server in DB
			let sql = "INSERT INTO Server (servername, userId, serverpicture) VALUES ('" + servername + "', " + user._id + ", '\/static\/pictures\/servers\/default.jpg')";
			let db = DB.open();
			db.run(sql, function(err) {
				if (err) {
					let obj = {success: false, errors:[err.message]};
					res.status(500).json(obj);
				}
				else {
					// Insert ServerUser link
					let serverId = this.lastID;
					let sql = "INSERT INTO ServerUser (serverId, userId) VALUES (" + serverId + ", " + user._id + ")";
					let db = DB.open();
					db.run(sql, function(err) {
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
			
			DB.close(db);
			
		}
		else {
			let obj = {success: false, errors:['Authentication failed']};
			res.status(401).json(obj);
		}
	});
	
	// -------------------------- Server Invite Token -------------------------- //
	app.post('/server/invite', [
		check('token').not().isEmpty().trim().escape(),
		check('serverId').not().isEmpty().trim().escape()
	], (req, res) => {
		// On validation error
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			let obj = {success: false, errors: errors.array()};
			return res.status(422).json(obj);
		}
		
		let {token, serverId} = req.body;
		let user = func.get_token(token);
		if (user != null) {
			let sql = 'SELECT * from ServerUser WHERE serverId = ' + serverId + ' AND userId = ' + user._id;
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
					let obj = {success: false, errors:['User is not in server\'s userlist.']};
					res.status(401).json(obj);
				}
				
				else {
					let inviteToken = func.invite_token(serverId);
					let obj = {success: true, token: inviteToken};
					res.status(200).json(obj);
				}
			});
		}
		else {
			let obj = {success: false, errors:['Authentication failed']};
			res.status(401).json(obj);
		}
	});
	
	
	
	// -------------------------- Join Server -------------------------- //
	app.post('/server/join', [
		check('token').not().isEmpty().trim().escape(),
		check('invite').not().isEmpty().trim().escape()
	], (req, res) => {
		// On validation error
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			let obj = {success: false, errors: errors.array()};
			return res.status(422).json(obj);
		}
		
		// Request is formed properly
		let {token, invite} = req.body;
		let user = func.get_token(token);
		let server = func.get_token(invite);
		if ((user != null) && (server != null)) {
			// Check user isn't already in the server
			let sql = 'SELECT * FROM ServerUser WHERE serverId = ' + server._id + ' AND userId = ' + user._id;
			let db = DB.open();
			db.get(sql, function(err, row) {
				// Error on query execution
				if (err) {
					let obj = {success: false, errors:[err.message]};
					res.status(500).json(obj);
				}
				
				// No result, add it to DB
				else if (row == null) {
					let sql = "INSERT INTO ServerUser (serverId, userId) VALUES (" + server._id + ", " + user._id + ")";
					let db = DB.open();
					db.run(sql, function(err) {
					if (err) {
						let obj = {success: false, errors: [err.message]};
						res.status(500).json(obj);
					}
					else {
						let obj = {success: true};
						res.status(200).json(obj);
					}
					});
					DB.close(db);
				}
				// Already in server user list
				else {
					let obj = {success: false, errors:['User is already in server\'s userlist.']};
					res.status(401).json(obj);
				}
			});
			DB.close(db);
		}
		else {
			let errors = []
			if (user == null) {errors.push('Authentication failed');}
			if (server == null) {errors.push('Error in invite token');}
			let obj = {success: false, errors: errors};
			res.status(500).json(obj);
		}
	});
}