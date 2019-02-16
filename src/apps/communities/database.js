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

const Sequelize = require('sequelize');
const fs = require('fs');

const dbLocation = __dirname + '/../../../db/communities.db';
const logging = console.log;

const dbHost = process.env.DB_HOST;
const dbUsername = process.env.DB_USER;
const dbPassword = process.env.DB_PASS;
const dbName = process.env.DB_NAME;

let dialect = 'sqlite';
if(dbHost) {
  dialect = 'postgres';
}

if(!fs.existsSync(dbLocation)) {
  if(!fs.existsSync(__dirname + '/../../../db/')) {
    fs.mkdirSync(__dirname + '/../../../db/');
  }
  const createStream = fs.createWriteStream(dbLocation);
  createStream.end();
}

const sequelize = new Sequelize(dbName, dbUsername, dbPassword, {
  host: dbHost,
  dialect: dialect,

  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },

  // SQLite only
  storage: dbLocation,

  operatorsAliases: true,

  logging: logging
});

sequelize
  .authenticate()
  .then(() => {
    console.log('DB connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

const Post = sequelize.define('post', {
  community: Sequelize.STRING,
  block: Sequelize.INTEGER,
  fullPermlink: {
    type: Sequelize.STRING,
    primaryKey: true
  },
  featured: Sequelize.BOOLEAN,
  featurer: Sequelize.STRING,
  pinned: Sequelize.BOOLEAN
},{
  indexes:[
    {
      unique: false,
      fields:['block']
    }
  ]
});

const PinnedPost = sequelize.define('pinnedpost', {
  community: Sequelize.STRING,
  fullPermlink: Sequelize.STRING
}, {
  indexes: [
  {
    fields: ['community']
  }
]});

const Community = sequelize.define('community', {
  community: {
    type: Sequelize.STRING,
    primaryKey: true
  },
  metadata: Sequelize.STRING,
  block: Sequelize.INTEGER,
  posts: Sequelize.INTEGER,
  dailyposts: Sequelize.INTEGER,
  weeklyusers: Sequelize.INTEGER
})

module.exports = {
  setup: function(callback) {
    sequelize.sync().then(callback);
  },
  post: function(community, block, author, permlink) {
    // Need to make sure post isn't already in DB - this happens sometimes on restarts.
    Post.destroy({where: { fullPermlink: author + '/' + permlink}}).then(() => {
      Post.create({
        community: community,
        block: block,
        fullPermlink: author + '/' + permlink,
        featured: false,
        featurer: '',
        pinned: false
      });
    });

    Community.findOne({ where: { community: community } }).then((rows) => {
      Community.update({posts: rows.dataValues.posts+1}, {
        where: {
          community: community
        }
      });
    });
  },

  feature: function(community, author, featurer, permlink) {
    Post.update({
      featured: true,
      featurer: featurer
    }, {
      where: {
        fullPermlink: author + '/' + permlink,
        community: community
      }
    });
  },

  pin: function(community, author, permlink) {
    Post.update({
      pinned: true
    }, {
      where: {
        fullPermlink: author + '/' + permlink,
        community: community
      }
    });

    PinnedPost.create({
      community: community,
      fullPermlink: author + '/' + permlink
    });
  },

  unpin: function(community, author, permlink) {
    Post.update({
      pinned: false
    }, {
      where: {
        fullPermlink: author + '/' + permlink,
        community: community
      }
    });

    PinnedPost.delete({
      where: {
        community: community,
        fullPermlink: author + '/' + permlink
      }
    });
  },

  getNew: function(community, limit, callback) {
    Post.findAll({
      where: {
        community: community
      },
      order: sequelize.literal('block DESC'),
      limit: limit
    }).then(callback);
  },

  getFeatured: function(community, limit, callback) {
    Post.findAll({
      where: {
        community: community,
        featured: true
      },
      order: sequelize.literal('block DESC'),
      limit: limit
    }).then(callback);
  },

  getPinned: function(community, callback) {
    // Workaround found here: https://stackoverflow.com/questions/36164694/sequelize-subquery-in-where-clause
    const tempSQL = sequelize.dialect.QueryGenerator.selectQuery('pinnedposts',{
      attributes: ['fullPermlink'],
      where: {
        community: community
      }
    }).slice(0,-1); // to remove the ';' from the end of the SQL

    Post.findAll( {
      where: {
        fullPermlink: {
          $in: sequelize.literal('(' + tempSQL + ')'),
        }
      }
    }).then(callback);
  },

  block: function(community, author, permlink) {
    Post.destroy({ where: {
      community: community,
      fullPermlink: author + '/' + permlink
    } });
  },

  create: function(community,block) {
    Community.destroy({
      where: {
        community: community
      }
    }).then(() => {
      Community.create({
        community: community,
        metadata: '{}',
        block: block,
        posts: 0,
        dailyposts: 0,
        weeklyusers: 0
      });
    });
  },

  updateMeta: function(community, metadata) {
    Community.update({
      metadata: metadata
    }, {
      where: {
        community: community
      }
    });
  },

  getData: function(community, callback) {
    Community.findOne({
      where: {
        community: community
      }
    }).then(callback);
  },

  getCommunityOfPost: function(author, permlink, callback) {
    Post.findOne({
      where: {
        fullPermlink: author + '/' + permlink
      }
    }).then(callback);
  },

  getCommunities: function(filter, limit, sort, search, state, callback) {
    function returnRows(rows) {
      for(i in rows) {
        rows[i].roles = state.communities[rows[i].community].roles;
      }
      callback(rows);
    }

    if(filter === 'date') {
      Community.findAll({
        order: [['block', sort]],
        limit: limit
      }).then(returnRows);
    } else if(filter === 'dailyposts') {
      Community.findAll({
        order: [['dailyposts', sort]],
        limit: limit
      }).then(returnRows);
    } else if(filter === 'weeklyusers') {
      Community.findAll({
        order: [['weeklyusers', sort]],
        limit: limit
      }).then(returnRows);
    } else if(filter === 'name') {
      Community.findAll({
        order: [['posts', sort]],
        where: {
          community: {
            [Sequelize.Op.like]: '%' + search + '%'
          }
        },
        limit: limit
      }).then(returnRows);
    } else {
      Community.findAll({
        order: [['posts', sort]],
        limit: limit
      }).then(returnRows);
    }
  },

  updateDailyPosts: function(block, getState) {
    Post.findAll({
      attributes: ['community'],
      where: {
        block: {[Sequelize.Op.gt]: block-28800}
      }
    }).then((rows) => {
      const state = getState();

      const communityDailyPosts = {};
      for(community in state.communities) {
        communityDailyPosts[community] = 0;
      }

      for(i in rows) {
        communityDailyPosts[rows[i].dataValues.community]++;
      }

      for(community in communityDailyPosts) {
        Community.update({ dailyposts: communityDailyPosts[community]}, {
          where: {
            community: community
          }
        });
      }
      console.log('Updated daily posts.')
    });
  },

  updateWeeklyUsers: function(block, getState) {
    Post.findAll({
      attributes: ['community', 'fullPermlink'],
      where: {
        block: {[Sequelize.Op.gt]: block-201600}
      }
    }).then((rows) => {
      const state = getState();

      const communityWeeklyUsers = {};
      for(community in state.communities) {
        communityWeeklyUsers[community] = new Set();
      }

      for(i in rows) {
        communityWeeklyUsers[rows[i].dataValues.community].add(rows[i].dataValues.fullPermlink.split('/')[0]);
      }

      for(community in communityWeeklyUsers) {
        Community.update({ weeklyusers: communityWeeklyUsers[community].size}, {
          where: {
            community: community
          }
        });
      }
      console.log('Updated weekly users.')
    });
  }
}
