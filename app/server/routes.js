module.exports = function(app, DB, func, validator) {
	
	// -------------------------- Create Server -------------------------- //
	app.post('/server/create',  [
		validator.check('token').not().isEmpty().trim().escape(),
		validator.check('servername').not().isEmpty().trim().escape()
	], (req, res) => {
		const errors = validator.validationResult(req);
		if (!errors.isEmpty()) {
			let obj = {success: false, errors: errors.array()};
			return res.status(422).json(obj);
		}
		
		// Request is formed properly
		let {token, servername} = req.body;
		let user = func.get_token(token);
		if (user != null) {
			// Insert Server in DB
			let sql = "INSERT INTO Server (ownerId, servername, serverpicture) VALUES (?, ?, '\/static\/pictures\/servers\/default.jpg')";
			let db = DB.open();
			db.run(sql, [user._id, servername], function(err) {
				if (err) {
					let obj = {success: false, errors:[err.message]};
					res.status(500).json(obj);
				}
				else {
					let serverId = this.lastID;
					// Create admin user group
					let sql = "INSERT INTO ServerRole (serverId, rolename) VALUES (?, 'Admins')";
					let db = DB.open();
					db.run(sql, [serverId], function(err) {
						if (err) {
							let obj = {success: false, errors:[err.message]};
							res.status(500).json(obj);
						}
						else {
							let admingroup = this.lastID;
							// Insert owner into ServerUser
							let sql = "INSERT INTO ServerUser (serverId, userId, roleId) VALUES (?, ?, ?)";
							let db = DB.open();
							db.run(sql, [serverId, user._id, admingroup], function(err) {
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
		}
		else {
			let obj = {success: false, errors:['Token error.']};
			res.status(401).json(obj);
		}
	});
	
	// -------------------------- Server Invite Token -------------------------- //
	app.post('/server/invite', [
		validator.check('token').not().isEmpty().trim().escape(),
		validator.check('servertoken').not().isEmpty().trim().escape()
	], (req, res) => {
		const errors = validator.validationResult(req);
		if (!errors.isEmpty()) {
			let obj = {success: false, errors: errors.array()};
			return res.status(422).json(obj);
		}
		
		let {token, servertoken} = req.body;
		let user = func.get_token(token);
		let server = func.get_token(servertoken);
		if ((user != null) && (user.type == 'user')) {
			if ((server != null) && (server.type == 'server')) {
				let sql = "SELECT _id FROM ServerUser WHERE userId = ? AND serverId = ?";
				let db = DB.open();
				db.get(sql, [user._id, server._id], function(err, row) {
					if (err) {
						let obj = {success: false, errors:[err.message]};
						res.status(500).json(obj);
					}
					else if (row == null) {
						let obj = {success: false, errors: ['Unauthorized']};
						res.status(401).json(obj);
					}
					else {
						let invite = func.gen_token('invite', server._id);
						let obj = {success: true, inviteToken: invite};
						res.status(200).json(obj)
					}
				});
			}
			else {
				let obj = {success: false, errors:['Server Token error.']};
				res.status(401).json(obj);
			}
		}
		else {
			let obj = {success: false, errors:['Token error.']};
			res.status(401).json(obj);
		}
	});


	// -------------------------- Join Server -------------------------- //
	// Can't work without Invite Token
	app.post('/server/join', [
		validator.check('token').not().isEmpty().trim().escape(),
		validator.check('invitetoken').not().isEmpty().trim().escape()
	], (req, res) => {
		const errors = validator.validationResult(req);
		if (!errors.isEmpty()) {
			let obj = {success: false, errors: errors.array()};
			return res.status(422).json(obj);
		}
		
		// Request is formed properly
		let {token, invitetoken} = req.body;
		let user = func.get_token(token);
		let server = func.get_token(invitetoken);
		if ((user != null) && (user.type == "user")) {
			if ((server != null) && (server.type == "invite")) {
				
				// Check user isn't already in the server
				let sql = 'SELECT * FROM ServerUser WHERE serverId = ? AND userId = ?';
				let db = DB.open();
				db.get(sql, [server._id, user._id], function(err, row) {
					if (err) {
						let obj = {success: false, errors:[err.message]};
						res.status(500).json(obj);
					}
					
					// No result, add it to DB
					else if (row == null) {
						let sql = "INSERT INTO ServerUser (serverId, userId) VALUES (?, ?)";
						let db = DB.open();
						db.run(sql, [server._id, user._id], function(err) {
						if (err) {
							let obj = {success: false, errors: [err.message]};
							res.status(500).json(obj);
						}
						else {
							let obj = {success: true};
							res.status(200).json(obj);
						}
						});
					}
					// Result, Already in server user list
					else {
						let obj = {success: false, errors:['User is already in server userlist.']};
						res.status(401).json(obj);
					}
				});
				DB.close();
			}
			else {
				let obj = {success: false, errors: ['Invite Token error.']};
				res.status(500).json(obj);
			}
		}
		else {
			let obj = {success: false, errors: ['Token error.']};
			res.status(500).json(obj);
		}
	});
	
	// -------------------------- Server list -------------------------- //
	// returns a list of server you're a member of as tokens
	app.post('/server/in', [
		validator.check('token').not().isEmpty().trim().escape()
	], (req, res) => {
		const errors = validator.validationResult(req);
		if (!errors.isEmpty()) {
			let obj = {success: false, errors: errors.array()};
			return res.status(422).json(obj);
		}

		let user = func.get_token(req.body.token);		
		if ((user != null) && (user.type == 'user')) {
			let sql = 'SELECT serverId FROM ServerUser WHERE userId = ?';
			let db = DB.open();
			db.all(sql, [user._id], function(err, rows) {
				if (err) {
					let obj = {success: false, errors:[err.message]};
					res.status(500).json(obj);
				}
				else if (rows == null) {
					let obj = {success: true, servers: []};
					res.status(200).json(obj);
				}
				else {
					let servers = [];
					rows.forEach(function(row) {
						servers.push(func.gen_token("server", row.serverId));
					});
					console.log(servers);
					let obj = {success: true, servers: servers};
					res.status(200).json(obj);
				}
			});
			DB.close();
		}
		else {
			let obj = {success: false, errors:['Token error.']};
			res.status(401).json(obj);
		}
	});
	
	// -------------------------- User list -------------------------- //
	app.post('/server/users', [
		validator.check('token').not().isEmpty().trim().escape(),
		validator.check('servertoken').not().isEmpty().trim().escape()
	], (req, res) => {
		const errors = validator.validationResult(req);
		if (!errors.isEmpty()) {
			let obj = {success: false, errors: errors.array()};
			return res.status(422).json(obj);
		}
		
		let {token, servertoken} = req.body;
		let user = func.get_token(token);
		let server = func.get_token(servertoken);
		if ((user != null) && (user.type == 'user')) {
			if ((server != null) && (server.type == 'server')) {
				let sql = 'SELECT ServerUser.userId as uid, User.username as username FROM ServerUser JOIN User ON ServerUser.userId = User._id WHERE ServerUser.serverId = ?';
				let db = DB.open();
				db.all(sql, [server._id], function(err, rows) {
					let result = false;
					if (err) {
						let obj = {success: false, errors:[err.message]};
						res.status(500).json(obj);
					}
					else if (rows == null) {
						let obj = {success: false, errors: ["Server doesn't exist"]};
						res.status(500).json(obj);
					}
					else {
						let users = [];
						rows.forEach(function(row) {
							users.push(row.username);
							if (row.uid == user._id) {result = true;}
						});
						if (result) {
							let obj = {success: true, users: users};
							res.status(200).json(obj);
						}
						else {
							let obj = {success: false, errors: ['Unauthorized']};
						}
					}
				});
				DB.close();
			}
			else {
				let obj = {success: false, errors:['Server Token error.']};
				res.status(401).json(obj);
			}
		}
		else {
			let obj = {success: false, errors:['Token error.']};
			res.status(401).json(obj);
		}
	});
}