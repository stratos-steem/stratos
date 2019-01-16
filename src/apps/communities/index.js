const matcher = require('match-schema');
const schemas = require('./schemas');

function hasRole(state, user, community, role) { // Roles 'owner', 'admin', 'moderator', 'author'
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
    } else {
      return false;
    }
  } catch(err) {
    return false;
  }
}

function app(processor, getState, setState, prefix) {
  processor.on('communities_create', function(json, from) {
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

      console.log(from, 'created community', json.id);
    } else {
      console.log('Invalid community creation from', from)
    }
    setState(state)
  });

  processor.on('communities_grant_role', function(json, from) {
    var state = getState();
    const {matched, errorKey} = matcher.match(json, schemas.grantRole);
    if(matched && state.communities[json.community] !== undefined && (json.role === 'owner' || json.role === 'mod' || json.role === 'admin' || json.role === 'author')) {
      // Check authorization
      if(hasRole(state, from, json.community, json.role)) {
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

  return processor;
}

function cli(input, getState) {
  input.on('communities_create', function(args, transactor, username, key) {
    const id = args[0];

    transactor.json(username, key, 'communities_create', {
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

    transactor.json(username, key, 'communities_grant_role', {
      community: community,
      receiver: receiver,
      role: role
    }, function(err, result) {
      if(err) {
        console.error(err);
      }
    });
  });
}

function api(app, getState) {
  return app;
}

module.exports = {
  app: app,
  cli: cli,
  api: api
}
