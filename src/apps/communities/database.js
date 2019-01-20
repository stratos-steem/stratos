const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const newStorageLimit = 4;  // How many posts maximum to store in the 'new' category.
                            // Posts older than this limit will be deleted in clearOldPosts() as long as they are >7 days old.

const dbLocation = 'db/communities.db';

if(!fs.existsSync(dbLocation)) {
  if(!fs.existsSync('db/')) {
    fs.mkdirSync('db/')
  }
  const createStream = fs.createWriteStream('db/communities.db');
  createStream.end();
}

const db = new sqlite3.Database(dbLocation);

// Removes old posts >7 days old from new in community DB, keeping newStorageLimit posts at the end.
function clearOldPosts(community, currentBlock) {
   const query = 'DELETE FROM ' + community + ' WHERE (SELECT max(rowid) FROM '+ community + ') - ' + newStorageLimit + ' > rowid AND block < ' + (currentBlock - 20160);

   db.run(query, [], function(err) {
     if(err) {
       throw err;
     }
   });
}

module.exports = {
  post: function(community, block, author, permlink) {
    // Insert value and at the same time remove all val
    const query = 'INSERT INTO ' + community + '(block, author, permlink) VALUES (?,?,?);';
    db.run(query, [block, author, permlink], function(err){
      if(err) {
        throw err
      }
    });

    clearOldPosts(community, block);
  },

  create: function(community) {
    db.run('CREATE TABLE IF NOT EXISTS ' + community + '(block, author, permlink)', function(err){
      if(err) {
        throw err
      }
    });
  },

  getNew: function(community, limit, callback) {
    const query = 'SELECT DISTINCT rowid, author, permlink, block FROM ' + community + ' ORDER BY block DESC LIMIT ' + limit;

    db.all(query, [], function(err, rows) {
      if(err) {
        throw err
      }

      callback(rows);
    });
  }
}
