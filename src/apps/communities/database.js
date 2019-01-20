const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const dbLocation = 'db/communities.db';

if(!fs.existsSync(dbLocation)) {
  if(!fs.existsSync('db/')) {
    fs.mkdirSync('db/')
  }
  const createStream = fs.createWriteStream('db/communities.db');
  createStream.end();
}

const db = new sqlite3.Database(dbLocation);

module.exports = {
  post: function(community, block, author, permlink) {
    const query = 'INSERT INTO ' + community + '(block, author, permlink) VALUES (?,?,?)';
    db.run(query, [block, author, permlink], function(err){
      if(err) {
        throw err
      }
    });
  },

  create: function(community) {
    db.run('CREATE TABLE IF NOT EXISTS ' + community + '(block, author, permlink)', function(err){
      if(err) {
        throw err
      }
    });
  },

  getNew: function(community, limit, callback) {
    const query = 'SELECT * FROM ' + community + ' ORDER BY block DESC LIMIT ' + limit;

    db.all(query, [], function(err, rows) {
      if(err) {
        throw err
      }

      callback(rows);
    });
  }
}
