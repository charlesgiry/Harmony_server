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
	// Need a massive rework
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
		let {token, invite} = req.body;
		let user = func.get_token(token);
		let server = func.get_token(invite);
		if (((user != null) && (user.type == "user")) && ((server != null) && (server.type == "invite"))) {
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
					let obj = {success: false, errors:['User is already in server\'s userlist.']};
					res.status(401).json(obj);
				}
			});
			DB.close();
		}
		else {
			let errors = []
			if (user == null || user.type != "user") {errors.push('Token error');}
			if (server == null || server.type != "invite") {errors.push('Invite Token error');}
			let obj = {success: false, errors: errors};
			res.status(500).json(obj);
		}
	});
	
	// -------------------------- Server list -------------------------- //
	// returns a list of server you're a member of as tokens
	app.post('/server/get', [
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
}