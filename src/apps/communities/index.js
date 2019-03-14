/*
  Communities
  ---

  Implementation of Steem communities, which are similar to subreddits on Reddit.
*/

const matcher = require('match-schema');
const schemas = require('./schemas');

const database = require('./../../database');

const communityCreationFeeReceiver = 'shredz7'  // Placeholders for testing
const communityCreationFee = '1.000 STEEM'


function canEditRole(state, user, community, role) { // Roles 'owner', 'admin', 'moderator', 'author'
  try {
    const roles = state.communities[community].roles

    if(roles.owner.indexOf(user) !== -1 || roles.owner.indexOf('eo') !== -1) {  // @eo means everyone.
      return true;
    } else if(roles.admin.indexOf(user) !== -1 || roles.admin.indexOf('eo') !== -1) {
      if(role === 'owner') {
        return false;
      } else {
        return true;
      }
    } else if(roles.mod.indexOf(user) !== -1 || roles.mod.indexOf('eo') !== -1) {
      if(role === 'mod' || role === 'author') {
        return true;
      } else {
        return false;
      }
    } else if(roles.author.indexOf(user) !== -1){
      return false;
    }
  } catch(err) {
    return false;
  }
}

function canPost(state, user, community) {
  for(i in ['owner', 'admin', 'mod', 'author']) {
    const role = ['owner', 'admin', 'mod', 'author'][i];
    const roles = state.communities[community].roles;
    if(roles[role].indexOf(user) !== -1) {
      return true;
    }
  }
}

function editRole(state, updateType, community, from, receiver, role) {
  if(updateType === 'add') {
    // Check authorization
    if(canEditRole(state, from, community, role)) {
      console.log(from, 'granted role', role, 'to', receiver);
      state.communities[community].roles[role].push(receiver)
    } else {
      console.log(from, 'tried to grant role but lacked proper permissions.')
    }
  } else {
    // Check authorization
    if(canEditRole(state, from, community, role)) {
      console.log(from, 'removed role', role, 'from', receiver);
      const roleIndex = state.communities[community].roles[role].indexOf(receiver);
      state.communities[community].roles[role].splice(roleIndex, 1);
    } else {
      console.log(from, 'tried to remove role but lacked proper permissions.')
    }
  }

  return state;
}

function app(processor, getState, setState, prefix) {
  processor.on('cmmts_grant_role', function(json, from) {
    var state = getState();
    const {matched, errorKey} = matcher.match(json, schemas.grantRole);
    if(matched && state.communities[json.community] !== undefined && (json.role === 'owner' || json.role === 'mod' || json.role === 'admin' || json.role === 'author') && state.communities[json.community].roles[json.role].indexOf(json.receiver) === -1) {
      state = editRole(state, 'add', json.community, from, json.receiver, json.role);
    } else {
      console.log('Invalid role grant from', from)
    }

    setState(state);
  });

  processor.on('cmmts_remove_role', function(json, from) {
    var state = getState();
    const {matched, errorKey} = matcher.match(json, schemas.removeRole);
    if(matched && state.communities[json.community] !== undefined && (json.role === 'owner' || json.role === 'mod' || json.role === 'admin' || json.role === 'author') && state.communities[json.community].roles[json.role].indexOf(json.receiver) > -1) {
      state = editRole(state, 'remove', json.community, from, json.receiver, json.role);
    } else {
      console.log('Invalid role removal from', from)
    }

    setState(state);
  });

  processor.on('cmmts_bulk_role_update', function(json, from) {
    var state = getState();

    const {matched, errorKey} = matcher.match(json, schemas.bulkRoleUpdate);
    if(matched && state.communities[json.community] !== undefined) {
      let state = getState();
      for(const i in json.operations) {
        const operation = json.operations[i];
        if(operation.updateType === 'add') {
          if(matched && state.communities[json.community] !== undefined && (operation.role === 'owner' || operation.role === 'mod' || operation.role === 'admin' || operation.role === 'author') && state.communities[json.community].roles[operation.role].indexOf(operation.receiver) === -1) {
            state = editRole(state, 'add', json.community, from, operation.receiver, operation.role);
          }
        } else {
          if(matched && state.communities[json.community] !== undefined && (operation.role === 'owner' || operation.role === 'mod' || operation.role === 'admin' || operation.role === 'author') && state.communities[json.community].roles[operation.role].indexOf(operation.receiver) > -1) {
            state = editRole(state, 'remove', json.community, from, operation.receiver, operation.role);
          }
        }
      }

      setState(state);
    } else {
      console.log('Invalid bulk role update from', from)
    }
  });

  processor.on('cmmts_block_post', function(json, from) {
    var state = getState();

    const {matched, errorKey} = matcher.match(json, schemas.blockPost);
    if(matched && state.communities[json.community] !== undefined) {
      if(canEditRole(state, from, json.community, 'mod')) {
        database.block(json.community, json.author, json.permlink);
      }
    }
  });

  processor.on('cmmts_feature', function(json, from) {
    var state = getState();

    const {matched, errorKey} = matcher.match(json, schemas.featurePost);
    if(matched && state.communities[json.community] !== undefined) {
      if(canEditRole(state, from, json.community, 'mod')) {
        database.feature(json.community, json.author, from, json.permlink);
      }
    }
  });

  processor.on('cmmts_pin', function(json, from) {
    var state = getState();

    const {matched, errorKey} = matcher.match(json, schemas.featurePost);
    if(matched && state.communities[json.community] !== undefined) {
      if(canEditRole(state, from, json.community, 'mod')) {
        database.pin(json.community, json.author, json.permlink);
      }
    }
  });

  processor.on('cmmts_unpin', function(json, from) {
    var state = getState();

    const {matched, errorKey} = matcher.match(json, schemas.featurePost);
    if(matched && state.communities[json.community] !== undefined) {
      if(canEditRole(state, from, json.community, 'mod')) {
        database.unpin(json.community, json.author, json.permlink);
      }
    }
  });

  processor.on('cmmts_update_meta', function(json, from) {
    var state = getState();

    const {matched, errorKey} = matcher.match(json, schemas.updateMeta);
    if(matched && state.communities[json.community] !== undefined) {
      if(canEditRole(state, from, json.community, 'admin')) {
        database.updateMeta(json.community, json.metadata);
      }
    }
  });

  processor.onOperation('comment', function(json) {
    var state = getState();
    if(json.parent_author === '' && json.json_metadata) {
      let meta = {}
      try {
        meta = JSON.parse(json.json_metadata);
      } catch(err) {
        meta = {}
      }
      const community = meta[prefix+'cmmts_post']

      if(community) {
        if(state.communities[community] && canPost(state, json.author, community)) {
          database.post(community, processor.getCurrentBlockNumber(), json.author, json.permlink);
        }
      }
    }
    setState(state);
  });

  return processor;
}

function onTransfer(json, prefix, getState, setState, processor) { // The DEX and the Communities both share use of transfer operation, so the DEX calls this on every transfer
  const state = getState();
  const memoPrefix = '!' + prefix + 'cmmts_create'; // Prefixes the data in the memo, if this is the prefix then this is trying to create a community
  if(json.memo.split(' ')[0] === memoPrefix && json.to === communityCreationFeeReceiver && json.amount === communityCreationFee) {  // All community creation should be sent to communityCreationFeeReceiver
    const community = json.memo.split(' ')[1]
    const {matched, errorKey} = matcher.match(community, schemas.community);
    if(matched && state.communities[community] === undefined) {
      state.communities[community] = {
        roles: {
          owner: [
            json.from
          ],
          admin: [],
          mod: [],
          author: []
        }
      }

      database.create(community, processor.getCurrentBlockNumber());

      console.log(json.from, 'created community', community);
    } else {
      console.log('Invalid community creation from', json.from);
    }
  }

  setState(state);
}

function cli(input, getState, prefix) {

  input.on('communities_grant_role', function(args, transactor, username, key) {
    const role = args[0];
    const receiver = args[1];
    const community = args[2];

    transactor.json(username, key, 'cmmts_grant_role', {
      community: community,
      receiver: receiver,
      role: role
    }, function(err, result) {
      if(err) {
        console.error(err);
      }
    });
  });

  input.on('communities_remove_role', function(args, transactor, username, key) {
    const role = args[0];
    const receiver = args[1];
    const community = args[2];

    transactor.json(username, key, 'cmmts_remove_role', {
      community: community,
      receiver: receiver,
      role: role
    }, function(err, result) {
      if(err) {
        console.error(err);
      }
    });
  });

  input.on('communities_bulk_role_update', function(args, transactor, username, key, client, steem, fullInputString) {
    const community = args[0];
    const split = fullInputString.split(':').slice(1).map(x => x.trim());

    const json = {
      community: community,
      operations: []
    }
    for(const i in split) {
      const data = split[i].split(' ');
      const type = data[0]; // remove or add
      const receiver = data[1];
      const role = data[2];
      json.operations.push({
        updateType: type,
        receiver: receiver,
        role: role
      });
    }

    transactor.json(username, key, 'cmmts_bulk_role_update', json, function(err, result) {
      if(err) {
        console.error(err);
      }
    });
  });

  input.on('communities_post', function(args, transactor, username, key, client, dsteem) {

    client.broadcast
      .comment(
        {
            author: username,
            body: 'Test post',
            json_metadata: '{"' + prefix + 'cmmts_post":"' + args[1] + '"}',
            parent_author: '',
            parent_permlink: 'test',
            permlink: args[0],
            title: 'Test post'
        },
        dsteem.PrivateKey.fromString(key)
    )
    .then(
        function(result) {},
        function(error) {
            console.error(error);
        }
    );
  });

  input.on('communities_block_post', function(args, transactor, username, key, client, dsteem) {
    const permlink = args[0];
    const author = args[1];
    const community = args[2];

    transactor.json(username, key, 'cmmts_block_post', {
      permlink: permlink,
      author: author,
      community: community
    }, function(err, result) {
      if(err) {
        console.error(err);
      }
    });
  });

  input.on('communities_feature', function(args, transactor, username, key, client, dsteem) {
    const permlink = args[0];
    const author = args[1];
    const community = args[2];

    transactor.json(username, key, 'cmmts_feature', {
      permlink: permlink,
      author: author,
      community: community
    }, function(err, result) {
      if(err) {
        console.error(err);
      }
    });
  });

  input.on('communities_pin', function(args, transactor, username, key, client, dsteem) {
    const permlink = args[0];
    const author = args[1];
    const community = args[2];

    transactor.json(username, key, 'cmmts_pin', {
      permlink: permlink,
      author: author,
      community: community
    }, function(err, result) {
      if(err) {
        console.error(err);
      }
    });
  });

  input.on('communities_unpin', function(args, transactor, username, key, client, dsteem) {
    const permlink = args[0];
    const author = args[1];
    const community = args[2];

    transactor.json(username, key, 'cmmts_unpin', {
      permlink: permlink,
      author: author,
      community: community
    }, function(err, result) {
      if(err) {
        console.error(err);
      }
    });
  });

  input.on('communities_update_meta', function(args, transactor, username, key, client, dsteem) {
    const community = args[0];
    const metadata = args.slice(1).join(' ');

    transactor.json(username, key, 'cmmts_update_meta', {
      community: community,
      metadata: metadata
    }, function(err, result) {
      if(err) {
        console.error(err);
      }
    });
  });
}

function api(app, getState) {
  app.get('/communities/:community/new', (req, res, next) => {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    database.getNew(req.params.community, limit, offset, function(rows) {
      res.send(JSON.stringify(rows, null, 2));
    });
  })

  app.get('/communities/:community/featured', (req, res, next) => {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    database.getFeatured(req.params.community, limit, offset, function(rows) {
      res.send(JSON.stringify(rows, null, 2));
    });
  })

  app.get('/communities/:community/pinned', (req, res, next) => {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    database.getPinned(req.params.community, limit, offset, function(rows) {
      res.send(JSON.stringify(rows, null, 2));
    });
  })

  app.get('/communities/:community', (req, res, next) => {
    if(getState().communities[req.params.community]) {
      database.getData(req.params.community, function(data) {
        data.dataValues.roles = getState().communities[req.params.community].roles;
        res.send(JSON.stringify(data.dataValues, null, 2));
      });
    } else {
      next();
    }
  });

  app.get('/communities/@:author/:permlink/community', (req, res, next) => {
    database.getCommunityOfPost(req.params.author, req.params.permlink, function(response) {
      res.send(JSON.stringify(response, null, 2));
    });
  });

  app.get('/communities/search/:filter', (req, res, next) => {
    const filter = req.params.filter;
    const sortQuery = req.query.sort || 'highest';       // 'highest' means highest of value first (default), 'lowest' means lowest of value first
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search;

    var sort;

    if(sortQuery === 'lowest') {
      sort = 'ASC'
    } else {
      sort = 'DESC'
    }

    database.getCommunities(filter, limit, offset, sort, search, getState(), function(rows) {
      res.send(JSON.stringify(rows,null,2));
    });
  });

  return app;
}

function updateDailyPosts(block, getState) {
  database.updateDailyPosts(block, getState);
}

function updateWeeklyUsers(block, getState) {
  database.updateWeeklyUsers(block, getState);
}

module.exports = {
  app: app,
  cli: cli,
  api: api,
  updateDailyPosts: updateDailyPosts,
  updateWeeklyUsers: updateWeeklyUsers,
  onTransfer: onTransfer
}
