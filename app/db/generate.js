module.exports = function(sqlite3, DB_FILE) {
	let db = new sqlite3.Database(DB_FILE);
	console.log('\nGenerating DB if not exists');
	console.log('	Activating Foreign Key constraint');
	db.run('PRAGMA foreign_keys = ON');

	console.log('	Create if not exists User table');
	db.run('CREATE TABLE IF NOT EXISTS User (_id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password TEXT NOT NULL, avatar TEXT)');
	
	console.log('	Create if not exists Server table');
	db.run('CREATE TABLE IF NOT EXISTS Server (_id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, servername TEXT NOT NULL UNIQUE, serverpicture TEXT, FOREIGN KEY (userId) REFERENCES User(_id))');
	
	console.log('	Create if not exists ServerUser table');
	db.run('CREATE TABLE IF NOT EXISTS ServerUser (_id INTEGER PRIMARY KEY AUTOINCREMENT, serverId INTEGER, userId INTEGER, FOREIGN KEY (serverId) REFERENCES Server(_id), FOREIGN KEY (userId) REFERENCES User(_id))');
	
	console.log('	Create if not exists ServerRole table');
	db.run('CREATE TABLE IF NOT EXISTS ServerRole (_id INTEGER PRIMARY KEY AUTOINCREMENT, serverId INTEGER, rolename TEXT NOT NULL, FOREIGN KEY(serverId) REFERENCES Server(_id))');
	
	console.log('	Create if not exists ServerEmote table');
	db.run('CREATE TABLE IF NOT EXISTS ServerEmote (_id INTEGER PRIMARY KEY AUTOINCREMENT, serverId INTEGER, code TEXT NOT NULL, url TEXT NOT NULL, FOREIGN KEY(serverId) REFERENCES Server(_id))');
	
	console.log('DB generated\n');
	db.close();
}