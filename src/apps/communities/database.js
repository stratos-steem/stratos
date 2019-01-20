const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const dbLocation = 'db/communities.db';

if(!fs.existsSync(dbLocation)) {
  fs.mkdirSync('db/')
  const createStream = fs.createWriteStream('db/communities.db');
  createStream.end();
}

const db = new sqlite3.Database(dbLocation);

return {
  post: function() {

  },

  create: function() {

  }
}
