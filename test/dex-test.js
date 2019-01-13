const expect = require('chai').expect

const dummySteemState = require('./steem-state-clone')
const dex = require('../src/apps/dex')


describe('dex', function() {
  var processor;
  var state;

  function getState() {
    return state;
  }
  function setState(value) {
    state = value;
  }


  beforeEach(function () {
    processor = dummySteemState();    // Initialize a dummy steem state to use to trigger transactions artificially
    dex.app(processor, getState, setState,'test_prefix_');    // Initialize DEX
  });

  it('Successfully completes a trade between two users', function() {
    state = {
      balances: {
        alice: 10000
      },
      dex: {

      }
    }

    processor.triggerCustomJson('dex_sell_order', 'alice', {
      stratos: 10000,  // 10.000 actual SRTS
      steem: 100      // 0.100 actual STEEM
    });

    expect(state.balances.alice).to.equal(0);

    processor.triggerOperation('transfer', {
      memo: '!test_prefix_dex_buy 0',
      to: 'alice',
      from: 'bob',
      amount: '0.1 STEEM'
    });

    expect(state.balances.bob).to.equal(10000);
    expect(state.balances.alice).to.equal(0);
    expect(state.dex.alice.length).to.equal(0);
  });

  it('Cancels sell orders', function() {
    state = {
      balances: {
        alice: 10000
      },
      dex: {

      }
    }

    processor.triggerCustomJson('dex_sell_order', 'alice', {
      stratos: 10000,  // 10.000 actual SRTS
      steem: 100      // 0.100 actual STEEM
    });

    processor.triggerCustomJson('dex_cancel_sell', 'alice', {
      id: 0
    });

    expect(state.balances.alice).to.equal(10000);
    expect(state.dex.alice.length).to.equal(0);
  });

  it('Cannot fill sell order when not paying enough STEEM', function() {
    state = {
      balances: {
        alice: 10000
      },
      dex: {
        alice: [
          {
            stratos: 1000,
            steem: 1000
          }
        ]
      }
    }

    processor.triggerOperation('transfer', {
      memo: '!test_prefix_dex_buy 0',
      to: 'alice',
      from: 'bob',
      amount: '0.1 STEEM'
    });

    expect(state.dex.alice.length).to.equal(1);
    expect(state.balances.alice).to.equal(10000);
  });
});
