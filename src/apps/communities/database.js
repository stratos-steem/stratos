/*
  Communities DB
  ---

  This stores communities data in a database. This data is all data that is not
  required for future consensus. For example, there is no need to know a community's
  posts to be able to determine what posts will be accepted in the future. But end
  users will most definitely want to know a community's posts. So we store this data
  in a local database, SQLite3.
*/

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

db.run('CREATE TABLE IF NOT EXISTS new_posts(community, block, author, permlink)', function(err) {
  if(err) {
    throw err
  }
});

db.run('CREATE TABLE IF NOT EXISTS featured_posts(community, block, author, featurer, permlink)', function(err) {
  if(err) {
    throw err
  }
});

module.exports = {
  post: function(community, block, author, permlink) {
    // Insert value and at the same time remove all val
    const query = 'INSERT INTO new_posts(community, block, author, permlink) VALUES(?,?,?,?)'
    db.run(query, [community, block, author, permlink], function(err){
      if(err) {
        throw err
      }
    });
  },

  feature: function(community, block, author, featurer, permlink) {
    const query = 'INSERT INTO featured_posts(community, block, author, featurer, permlink) VALUES(?,?,?,?,?)'
    db.run(query, [community, block, author, featurer, permlink], function(err){
      if(err) {
        throw err
      }
    });
  },

  getNew: function(community, limit, callback) {
    const query = 'SELECT DISTINCT * FROM new_posts WHERE community=? ORDER BY block DESC LIMIT ?';

    db.all(query, [community, limit], function(err, rows) {
      if(err) {
        throw err
      }

      callback(rows);
    });
  },

  getFeatured: function(community, limit, callback) {
    const query = 'SELECT DISTINCT * FROM featured_posts WHERE community=? ORDER BY block DESC LIMIT ?';

    db.all(query, [community, limit], function(err, rows) {
      if(err) {
        throw err
      }

      callback(rows);
    });
  },

  block: function(community, author, permlink) {
    const query1 = 'DELETE FROM new_posts WHERE author = ? AND permlink = ? AND community = ?;'

    db.run(query1, [author, permlink, community], function(err) {
      if(err) {throw err}
    })

    const query2 = 'DELETE FROM featured_posts WHERE author = ? AND permlink = ? AND community = ?;'

    db.run(query2, [author, permlink, community], function(err) {
      if(err) {throw err}
    })
  }
}
