const matcher = require('match-schema');
const schemas = require('./schemas');

function app(processor, getState, setState, prefix) {
  processor.on('token_send', function(json, from) {
    var state = getState()
    const {matched, errorKey} = matcher.match(json, schemas.send);
    if(matched && state.balances[from] && state.balances[from] > json.amount) { // Does it match the sell order transaction schema
      console.log('Send occurred from', from, 'to', json.to, 'of', json.amount, 'tokens.')

      if(state.balances[json.to] === undefined) {
        state.balances[json.to] = 0;
      }

      state.balances[json.to] += json.amount;
      state.balances[from] -= json.amount;
    } else {
      console.log('Invalid send operation from', from, 'error on property', errorKey)
    }

    setState(state)
  });

  return processor
}

function cli(input, getState) {
  input.on('token_send', function(args, transactor, username, key) {
    console.log('Sending tokens...')
    var to = args[0];

    var amount = parseInt(args[1]);

    transactor.json(username, key, 'token_send', {
      to: to,
      amount: amount
    }, function(err, result) {
      if(err) {
        console.error(err);
      }
    });
  });

  input.on('balance', function(args) {
    const user = args[0];
    const balance = getState().balances[user];
    if(balance === undefined) {
      balance = 0;
    }
    console.log(user, 'has', balance, 'tokens')
  })
}

function api(app, getState) {

  app.get('/token/balances', (req, res, next) => {
    res.send(JSON.stringify(getState().balances, null, 2))
  });

  app.get('/token/@:username', (req, res, next) => {
    res.send(JSON.stringify({balance: getState().balances[req.params.username]}, null, 2))
  })

  return app
}

module.exports = {
  app: app,
  cli: cli,
  api: api
}
