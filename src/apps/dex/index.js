/*
  dex
  ---

  Decentralized exchange between SRTS and STEEM. This exchange is not symmetrical;
  there is no such thing as buy orders. One can create a sell order, then others
  can fill the sell order by sending STEEM with a specific memo. Allowing limit buy
  orders introduces added complexity as soft-consensus apps cannot interact directly
  with the STEEM currency.
*/

const matcher = require('match-schema');
const schemas = require('./schemas');

function app(processor, getState, setState, prefix, communities) {
  processor.on('dex_sell_order', function(json, from) { // This transaction creates a sell order
    var state = getState()
    const {matched,errorKey} = matcher.match(json, schemas.sell_order); // Does it match the sell order transaction schema

    if(matched && state.balances[from] && state.balances[from] >= json.stratos) {
      console.log(from, 'created sell order selling', json.stratos, 'milliSRTS for', json.steem, 'milliSTEEM')
      if(state.dex[from] === undefined) {
        state.dex[from] = []
      }

      state.balances[from] -= json.stratos;

      state.dex[from].push({
        stratos: json.stratos,
        steem: json.steem
      });
    } else {
      console.log('Invalid sell order by', from, 'error at', errorKey);
    }

    setState(state)
  })

  processor.on('dex_cancel_sell',function(json, from) {         // This transaction cancels a sell order
    var state = getState()
    const {matched,errorKey} = matcher.match(json, schemas.cancel_sell);

    if(matched && state.dex[from] && state.dex[from][json.id]) {
      console.log(from, 'cancelled their sell order of id', json.id);
      state.balances[from] += state.dex[from][json.id].stratos;
      state.dex[from].splice(json.id, 1);
    } else {
      console.log('Invalid cancel sell order by', from, 'error at', errorKey);
    }

    setState(state)
  })

  processor.onOperation('transfer', function(json) {  // This is for filling a sell order (or buying)
    var state = getState()

    const splitMemo = json.memo.split(' ');
    const memoPrefix = '!' + prefix + 'dex_buy';

    if(splitMemo[0] === memoPrefix) { // If the memo is prefixed by memoPrefix
      const orderId = parseInt(splitMemo[1])
      const amount = parseFloat(json.amount.split(' ')[0])*1000
      const transferType = json.amount.split(' ')[1]

      if(typeof orderId === 'number' && state.dex[json.to] && state.dex[json.to][orderId] && transferType === 'STEEM') {
        if(amount >= state.dex[json.to][orderId].steem) {
          console.log(json.from, 'filled sell order from', json.to, 'and received', state.dex[json.to][orderId].stratos, 'milliSRTS at rate', state.dex[json.to][orderId].stratos/state.dex[json.to][orderId].steem, 'SRTS/STEEM')

          if(!state.balances[json.from]) {
            state.balances[json.from] = 0;
          }

          state.balances[json.from] += state.dex[json.to][orderId].stratos;
          state.dex[json.to].splice(orderId, 1);
        } else {
          console.log(json.from, 'tried to fill sell order with', json.to, 'but failed due to not providing enough payment.');
        }
      } else {
        console.log(json.from, 'tried to fill sell order from', json.to, 'but failed due to invalid transaction');
      }
    }

    setState(state)

    communities.onTransfer(json, prefix, getState, setState, processor); // Transfer is shared by both the DEX and communities, so the DEX also calls the communities onOperation
  })

  return processor
}

function cli(input, getState) {
  input.on('dex_sell_order', function(args,transactor,username,key) {
    const stratosAmount = parseInt(args[0])
    const steemAmount = parseInt(args[1])
    console.log('Creating sell order for', stratosAmount, 'milliSRTS to', steemAmount,'milliSTEEM...')

    transactor.json(username, key, 'dex_sell_order', {
      stratos: stratosAmount,
      steem: steemAmount
    }, function(err, result) {
      if(err) {
        console.error(err);
      }
    });
  })

  input.on('dex_cancel_sell', function(args,transactor,username,key) {
    const id = parseInt(args[0])
    console.log('Cancelling sell order #', id)

    transactor.json(username, key, 'dex_cancel_sell', {
      id: id
    }, function(err, result) {
      if(err) {
        console.error(err);
      }
    });
  })

  input.on('dex', function() {
    const state = getState()
    for(username in state.dex) {
      for(i in state.dex[username]) {
        console.log(i, ':', username, 'is selling', state.dex[username][i].stratos, 'milliSRTS for', state.dex[username][i].steem, 'milliSTEEM')
      }
    }
  })
}

function api(app, getState) {
  app.get('/dex/orders', (req, res, next) => {
    res.send(JSON.stringify(getState().dex, null, 2))
  })

  app.get('/dex/@:username', (req, res, next) => {
    res.send(JSON.stringify(getState().dex[req.params.username], null, 2))
  })

  return app
}

module.exports = {
  app: app,
  cli: cli,
  api: api
}
