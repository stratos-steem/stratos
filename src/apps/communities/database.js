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
    });

    db.run('CREATE TABLE IF NOT EXISTS community_meta(community, metadata,block,posts, dailyposts, weeklyusers)', function(err) {
      if(err) {
        throw err
      }
    });
  },

  post: function(community, block, author, permlink) {
    db.serialize(function() {
      const query1 = 'DELETE FROM posts WHERE fullPermlink=?'
      db.run(query1, [author+'/'+permlink], function(err){
        if(err) {
          throw err
        }
      });

      const query2 = 'INSERT INTO posts(community, block, fullPermlink, featured, featurer) VALUES(?,?,?,?,?)'
      db.run(query2, [community, block, author+'/'+permlink, false, ''], function(err){
        if(err) {
          throw err
        }
      });
    });

    const query2 = 'UPDATE community_meta SET posts=posts+1 WHERE community=?'
    db.run(query2, [community], function(err){
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

  create: function(community,block) {
    const query = 'INSERT INTO community_meta(community, metadata,block,posts, dailyposts, weeklyusers) VALUES (?,?,?,?,?,?)'

    db.run(query, [community, '{}',block,0,0,0], function(err) {
      if(err) {throw err}
    })
  },

  updateMeta: function(community, metadata) {
    const query = 'UPDATE community_meta SET metadata=? WHERE community=?'

    db.run(query, [metadata, community], function(err) {
      if(err) {throw err}
    })
  },

  getData: function(community, callback) {
    const query = 'SELECT DISTINCT * FROM community_meta WHERE community = ? LIMIT 1'

    db.all(query, [community], function(err, rows) {
      if(err) {
        throw err
      }
      if(rows[0]) {
        callback(rows[0]);
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
  },

  getCommunities: function(filter, limit, sort, search, state, callback) {
    function returnRows(rows) {
      for(i in rows) {
        console.log(state.communities, state.communities[rows[i].community])
        rows[i].roles = state.communities[rows[i].community].roles;
      }
      callback(rows);
    }

    if(filter === 'date') {
      const query = 'SELECT DISTINCT * FROM community_meta ORDER BY block ' + sort + ' LIMIT ?';
      db.all(query, [ limit], function(err, rows) {
        if(err) {
          throw err
        }
        returnRows(rows);
      });
    } else if(filter === 'dailyposts') {
      const query = 'SELECT DISTINCT * FROM community_meta ORDER BY dailyposts ' + sort + ' LIMIT ?'
      db.all(query, [limit], function(err, rows) {
        if(err) {
          throw err
        }
        returnRows(rows);
      });
    } else if(filter === 'weeklyusers') {
      const query = 'SELECT DISTINCT * FROM community_meta ORDER BY weeklyusers ' + sort + ' LIMIT ?'
      db.all(query, [limit], function(err, rows) {
        if(err) {
          throw err
        }
        returnRows(rows);
      });
    } else if(filter === 'name') {
      const query = 'SELECT DISTINCT * FROM community_meta WHERE community LIKE ? ORDER BY posts DESC LIMIT ?';
      db.all(query, ['%' + search + '%', limit], function(err, rows) {
        if(err) {
          throw err
        }
        returnRows(rows);
      })
    } else {
      const query = 'SELECT DISTINCT * FROM community_meta ORDER BY dailyposts ' + sort + ' LIMIT ?';
      db.all(query, [limit], function(err, rows) {
        if(err) {
          throw err
        }
        returnRows(rows);
      });
    }
  },

  updateDailyPosts: function(block, getState) {
    const query = 'SELECT community FROM posts WHERE block> ?'

    db.all(query, [block-28800], function(err, rows) {
      if(err) {
        throw err
      }
      const state = getState();

      const communityDailyPosts = {};
      for(community in state.communities) {
        communityDailyPosts[community] = 0;
      }

      for(i in rows) {
        communityDailyPosts[rows[i].community]++;
      }

      const query = 'UPDATE community_meta SET dailyposts = ? WHERE community = ?'
      for(community in communityDailyPosts) {
        db.run(query, [communityDailyPosts[community], community], function(err) {
          if(err) {
            throw err;
          }
        });
      }
    })
  },

  updateWeeklyUsers: function(block, getState) {
    const query = 'SELECT community, fullPermlink FROM posts WHERE block> ?'

    db.all(query, [block-201600], function(err, rows) {
      if(err) {
        throw err
      }
      const state = getState();

      const communityWeeklyUsers = {};
      for(community in state.communities) {
        communityWeeklyUsers[community] = new Set();
      }

      for(i in rows) {
        communityWeeklyUsers[rows[i].community].add(rows[i].fullPermlink.split('/')[0])
      }

      const query = 'UPDATE community_meta SET weeklyusers = ? WHERE community = ?'
      for(community in communityWeeklyUsers) {
        db.run(query, [communityWeeklyUsers[community].size, community], function(err) {
          if(err) {
            throw err;
          }
        });
      }
    })
  }
}
