const sqlite3 = require('sqlite3').verbose();
const DB_FILE = __dirname + '/db.sqlite';

module.exports = {
	db: null,
	
	open: function() {
		if (this.db === null) {
			this.db = new sqlite3.Database(DB_FILE, function(err){
				if (err) {return console.err(err.message);}
			});
		}
		return this.db;
	}, 
	
	close: function() {
		this.db.close(function(err) {
			if (err) {return console.error(err.message);}
		});
		this.db = null;
	}
}
require(__dirname + '/generate.js')(sqlite3, DB_FILE);