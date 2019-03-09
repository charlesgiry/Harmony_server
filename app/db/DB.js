const sqlite3 = require('sqlite3').verbose();
const DB_FILE = __dirname + '/db.sqlite';

module.exports = {
	open: function() {
		let db = new sqlite3.Database(DB_FILE, function(err){
			if (err) {return console.err(err.message);}
		});
		return db;
	}, 
	
	close: function(db) {
		db.close(function(err) {
			if (err) {return console.error(err.message);}
		});
	}
}

require(__dirname + '/generate.js')(sqlite3, DB_FILE);