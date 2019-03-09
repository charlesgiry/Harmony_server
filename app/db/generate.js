module.exports = function(sqlite3, DB_FILE) {
	let db = new sqlite3.Database(DB_FILE);
	console.log('Generating DB if not exists');
	console.log('Create if not exists User table');
	db.run('CREATE TABLE IF NOT EXISTS User (_id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password TEXT NOT NULL, avatar TEXT)');
	
	db.close();
}