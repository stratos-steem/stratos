const expect = require('chai').expect

const distributeGrants = require('./../src/distribute_grants')

describe('grant distribution', function() {
  it('Successfully distributes grants to two users',function() {
    state = {
      balances: {
        alice: 100000,
        bob: 2200,
        carl: 1000
      },
      dex: {},
      granters: {
        alice: true,
        bob: true
      },
      rewardPool: 2000,
      granterVotes: {
        alice: [
          'bob',
          'alice'
        ],
        bob: [
          'bob'
        ],
        carl: [
          'alice'
        ]
      }
    };

    state = distributeGrants(state, 20);

    expect(state.balances.alice).to.eql(101000);
    expect(state.balances.bob).to.eql(3200);
    expect(state.balances.carl).to.eql(1000);
  });
});
