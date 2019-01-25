/*
  Communities
  ---

  Implementation of Steem communities, which are similar to subreddits on Reddit.
*/

const matcher = require('match-schema');
const schemas = require('./schemas');

const database = require('./database');

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

function app(processor, getState, setState, prefix) {
  processor.on('cmmts_create', function(json, from) {
    var state = getState()
    const {matched, errorKey} = matcher.match(json, schemas.createCommunity);
    if(matched && state.communities[json.id] === undefined) {
      state.communities[json.id] = {
        roles: {
          owner: [
            from
          ],
          admin: [],
          mod: [],
          author: []
        },
        posts: {

        }
      }

      database.create(json.id);

      console.log(from, 'created community', json.id);
    } else {
      console.log('Invalid community creation from', from)
    }
    setState(state)
  });

  processor.on('cmmts_grant_role', function(json, from) {
    var state = getState();
    const {matched, errorKey} = matcher.match(json, schemas.grantRole);
    if(matched && state.communities[json.community] !== undefined && (json.role === 'owner' || json.role === 'mod' || json.role === 'admin' || json.role === 'author') && state.communities[json.community].roles[json.role].indexOf(json.receiver) === -1) {
      // Check authorization
      if(canEditRole(state, from, json.community, json.role)) {
        console.log(from, 'granted role', json.role, 'to', json.receiver);
        state.communities[json.community].roles[json.role].push(json.receiver)
      } else {
        console.log(from, 'tried to grant role but lacked proper permissions.')
      }
    } else {
      console.log('Invalid role grant from', from)
    }

    setState(state);
  });

  processor.on('cmmts_remove_role', function(json, from) {
    var state = getState();
    const {matched, errorKey} = matcher.match(json, schemas.removeRole);
    if(matched && state.communities[json.community] !== undefined && (json.role === 'owner' || json.role === 'mod' || json.role === 'admin' || json.role === 'author') && state.communities[json.community].roles[json.role].indexOf(json.receiver) > -1) {
      // Check authorization
      if(canEditRole(state, from, json.community, json.role)) {
        console.log(from, 'removed role', json.role, 'from', json.receiver);
        const roleIndex = state.communities[json.community].roles[json.role].indexOf(json.receiver);
        state.communities[json.community].roles[json.role].splice(roleIndex, 1);
      } else {
        console.log(from, 'tried to remove role but lacked proper permissions.')
      }
    } else {
      console.log('Invalid role removal from', from)
    }

    setState(state);
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
        database.feature(json.community, processor.getCurrentBlockNumber(), json.author, from, json.permlink);
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

function cli(input, getState, prefix) {
  input.on('communities_create', function(args, transactor, username, key) {
    const id = args[0];

    transactor.json(username, key, 'cmmts_create', {
      id: id
    }, function(err, result) {
      if(err) {
        console.error(err);
      }
    });
  });

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
    let limit = 200;

    const queryLimit = parseInt(req.query.limit);

    // Querier can supply limit as long as is not unreasonable
    if(queryLimit && queryLimit > 0 && queryLimit <= 1000) {
      limit = queryLimit
    }

    database.getNew(req.params.community, limit, function(rows) {
      res.send(JSON.stringify(rows, null, 2));
    });
  })

  app.get('/communities/:community/featured', (req, res, next) => {
    let limit = 200;

    const queryLimit = parseInt(req.query.limit);

    // Querier can supply limit as long as is not unreasonable
    if(queryLimit && queryLimit > 0 && queryLimit <= 1000) {
      limit = queryLimit
    }

    database.getFeatured(req.params.community, limit, function(rows) {
      res.send(JSON.stringify(rows, null, 2));
    });
  })

  app.get('/communities/:community', (req, res, next) => {
    database.getMeta(req.params.community, function(metadata) {
      res.send(JSON.stringify({
        metadata: metadata,
        roles: getState().communities[req.params.community].roles
      }, null, 2));
    });
  });

  app.get('/communities/@:author/:permlink/community', (req, res, next) => {
    database.getCommunityOfPost(req.params.author, req.params.permlink, function(response) {
      res.send(JSON.stringify(response, null, 2));
    });
  });

  return app;
}

module.exports = {
  app: app,
  cli: cli,
  api: api
}
