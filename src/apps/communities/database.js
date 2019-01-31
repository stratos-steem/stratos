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





module.exports = {
  // This removes all posts greater than the starting block so no duplicate posts are created.
  // Due to fullPermlink being a primary key duplicate posts can crash the entire server.
  setup: function(block) {

    db.run('CREATE TABLE IF NOT EXISTS posts(community, block, fullPermlink PRIMARY KEY, featured, featurer)', function(err) {
      if(err) {
        throw err
      }

      const query = 'DELETE FROM posts WHERE block > ?';
      db.run(query, block, function(err) {
        if(err) {
          throw err
        }
      });
    });

    db.run('CREATE TABLE IF NOT EXISTS community_meta(community, metadata)', function(err) {
      if(err) {
        throw err
      }
    });
  },

  post: function(community, block, author, permlink) {
    // Insert value and at the same time remove all val
    const query = 'INSERT INTO posts(community, block, fullPermlink, featured, featurer) VALUES(?,?,?,?,?)'
    db.run(query, [community, block, author+'/'+permlink, false, ''], function(err){
      if(err) {
        throw err
      }
    });
  },

  feature: function(community, author, featurer, permlink) {
    const query = 'UPDATE posts SET featured=?, featurer=? WHERE fullPermlink=?'
    db.run(query, [true, featurer, author + '/' + permlink], function(err){
      if(err) {
        throw err
      }
    });
  },

  getNew: function(community, limit, callback) {
    const query = 'SELECT DISTINCT * FROM posts WHERE community=? ORDER BY block DESC LIMIT ?';

    db.all(query, [community, limit], function(err, rows) {
      if(err) {
        throw err
      }

      callback(rows);
    });
  },

  getFeatured: function(community, limit, callback) {
    const query = 'SELECT DISTINCT * FROM posts WHERE community=? AND featured=? ORDER BY block DESC LIMIT ?';

    db.all(query, [community, true, limit], function(err, rows) {
      if(err) {
        throw err
      }

      callback(rows);
    });
  },

  block: function(community, author, permlink) {
    const query = 'DELETE FROM posts WHERE fullPermlink=? AND community = ?;'

    db.run(query, [author + '/' + permlink, community], function(err) {
      if(err) {throw err}
    })
  },

  create: function(community) {
    const query = 'INSERT INTO community_meta(community, metadata) VALUES (?,?)'

    db.run(query, [community, '{}'], function(err) {
      if(err) {throw err}
    })
  },

  updateMeta: function(community, metadata) {
    const query = 'UPDATE community_meta SET metadata=? WHERE community=?'

    db.run(query, [metadata, community], function(err) {
      if(err) {throw err}
    })
  },

  getMeta: function(community, callback) {
    const query = 'SELECT DISTINCT * FROM community_meta WHERE community = ? LIMIT 1'

    db.all(query, [community], function(err, rows) {
      if(err) {
        throw err
      }
      if(rows[0]) {
        callback(rows[0].metadata);
      } else {
        callback([]);
      }
    });
  },

  getCommunityOfPost: function(author, permlink, callback) {
    const query = 'SELECT DISTINCT * FROM posts WHERE fullPermlink=?'
    db.all(query, [author + '/' + permlink], function(err, rows1) {
      if(err) {
        throw err
      }

      if(rows1.length > 0) {
        callback({
          featured: rows1[0].featured,
          community: rows1[0].community
        });
      } else {
        callback({});
      }
    })
  }
}
