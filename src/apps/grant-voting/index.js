const matcher = require('match-schema');
const schemas = require('./schemas');

const maxGrantersVote = 11;

function app(processor, getState, setState, prefix) {
  if(!getState().granters) {
    var state = getState();
    state.granters = {};
    setState(state);
  }

  processor.on('become_granter', function(json, from) {
    var state = getState();

    state.granters[from] = true;

    console.log(from, 'became a granter')
    setState(state);
  });

  processor.on('stop_granter', function(json, from) {
    var state = getState();

    state.granters[from] = undefined;
    console.log(from, 'exited granter role')
    setState(state);
  });

  processor.on('granter_vote', function(json, from) {
    var state = getState();

    if(json instanceof Array && json.length <= maxGrantersVote) {
      console.log(from, 'changed granter votes to', json);
      if(!state.granterVotes) { state.granterVotes = {};}
      state.granterVotes[from] = json;
    } else {
      console.log('Invalid granter vote from', from);
    }

    setState(state);
  });


  return processor
}

function cli(input, getState) {
  input.on('become_granter', function(args, transactor, username, key) {
    transactor.json(username, key, 'become_granter', {}, function(err, result) {
      if(err) {
        console.error(err);
      }
    });
  });

  input.on('stop_granter', function(args, transactor, username, key) {
    transactor.json(username, key, 'stop_granter', {}, function(err, result) {
      if(err) {
        console.error(err);
      }
    });
  });

  input.on('granter_vote', function(args, transactor, username, key) {
    transactor.json(username, key, 'granter_vote', args, function(err, result) {
      if(err) {
        console.error(err);
      }
    });
  });
}

function api(app, getState) {
  return app
}

module.exports = {
  app: app,
  cli: cli,
  api: api
}
