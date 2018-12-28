const expect = require('chai').expect

const dummySteemState = require('./steem-state-clone')
const token = require('../src/apps/token')


describe('token', function() {
  var processor;
  var state;

  function getState() {
    return state;
  }
  function setState(value) {
    state = value;
  }

  before(function() {
    //console.log = function() {}
  })

  beforeEach(function () {
    processor = dummySteemState();
    token.app(processor, getState, setState);
  });

  it('Updates balances of user on token send', function() {
    state = {
      balances: {
        alice: 50
      }
    }

    processor.triggerCustomJson('token-send', 'alice', {
      to: 'bob',
      amount: 20
    });

    expect(state.balances.bob).to.equal(20);
    expect(state.balances.alice).to.equal(30);
  })

  it('Transaction invalid with overspend', function() {
    state = {
      balances: {
        alice: 50,
        bob: 133
      }
    }

    processor.triggerCustomJson('token-send', 'alice', {
      to: 'bob',
      amount: 55
    });

    expect(state.balances.alice).to.equal(50);
    expect(state.balances.bob).to.equal(133);
  })

  it('Transaction invalid with negative amount', function() {
    state = {
      balances: {
        alice: 50,
        bob: 100
      }
    }

    processor.triggerCustomJson('token-send', 'alice', {
      to: 'bob',
      amount: -10
    });

    expect(state.balances.alice).to.equal(50);
    expect(state.balances.bob).to.equal(100);
  })

  it('Transaction invalid with noninteger amount', function() {
    state = {
      balances: {
        alice: 50,
        bob: 100
      }
    }

    processor.triggerCustomJson('token-send', 'alice', {
      to: 'bob',
      amount: 12.42
    });

    expect(state.balances.alice).to.equal(50);
    expect(state.balances.bob).to.equal(100);
  })

  it('Transaction invalid with nonnumber amount', function() {
    state = {
      balances: {
        alice: 50,
        bob: 100
      }
    }

    processor.triggerCustomJson('token-send', 'alice', {
      to: 'bob',
      amount: 'notanumber'
    });

    expect(state.balances.alice).to.equal(50);
    expect(state.balances.bob).to.equal(100);
  })

  it('Transaction invalid with nonstring to', function() {
    state = {
      balances: {
        alice: 50,
        bob: 100
      }
    }

    processor.triggerCustomJson('token-send', 'alice', {
      to: 34,
      amount: 4
    });

    expect(state.balances.alice).to.equal(50);
    expect(state.balances.bob).to.equal(100);
  })

  it('Transaction invalid with nonstring to', function() {
    state = {
      balances: {
        alice: 50,
        bob: 100
      }
    }

    processor.triggerCustomJson('token-send', 'alice', {
      to: 34,
      amount: 4
    });

    expect(state.balances.alice).to.equal(50);
    expect(state.balances.bob).to.equal(100);
  })

  it('Transaction invalid with undefined values', function() {
    state = {
      balances: {
        alice: 50,
        bob: 100
      }
    }

    processor.triggerCustomJson('token-send', 'alice', {});

    expect(state.balances.alice).to.equal(50);
    expect(state.balances.bob).to.equal(100);
  })
})
