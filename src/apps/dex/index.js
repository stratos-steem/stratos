const matcher = require('match-schema');
const schemas = require('./schemas');

function app(processor, getState, setState, prefix) {
  processor.on('dex_sell_order', function(json, from) { // This transaction creates a sell order
    var state = getState()
    const {matched,errorKey} = matcher.match(json, schemas.sell_order); // Does it match the sell order transaction schema

    if(matched && state.balances[from] && state.balances[from] >= json.engine) {
      console.log(from, 'created sell order selling', json.engine, 'milliENGN for', json.steem, 'milliSTEEM')
      if(state.dex[from] === undefined) {
        state.dex[from] = []
      }

      state.balances[from] -= json.engine;

      state.dex[from].push({
        engine: json.engine,
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
      state.balances[from] += state.dex[from][json.id].engine;
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
          console.log(json.from, 'filled sell order from', json.to, 'and received', state.dex[json.to][orderId].engine, 'milliENGN at rate', state.dex[json.to][orderId].engine/state.dex[json.to][orderId].steem, 'ENGN/STEEM')

          if(!state.balances[json.from]) {
            state.balances[json.from] = 0;
          }

          state.balances[json.from] += state.dex[json.to][orderId].engine;
          state.dex[json.to].splice(orderId, 1);
        } else {
          console.log(json.from, 'tried to fill sell order with', json.to, 'but failed due to not providing enough payment.');
        }
      } else {
        console.log(json.from, 'tried to fill sell order from', json.to, 'but failed due to invalid transaction');
      }
    }

    setState(state)
  })

  return processor
}

function cli(input, getState) {
  input.on('dex_sell_order', function(args,transactor,username,key) {
    const engineAmount = parseInt(args[0])
    const steemAmount = parseInt(args[1])
    console.log('Creating sell order for', engineAmount, 'milliENGN to', steemAmount,'milliSTEEM...')

    transactor.json(username, key, 'dex_sell_order', {
      engine: engineAmount,
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
        console.log(i, ':', username, 'is selling', state.dex[username][i].engine, 'milliENGN for', state.dex[username][i].steem, 'milliSTEEM')
      }
    }
  })
}

module.exports = {
  app: app,
  cli: cli
}
