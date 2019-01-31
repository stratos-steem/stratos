// Contains the constants which determine the original state and the block the network starts at.

const genesisState = {
  balances: {
    shredz7: 9900000,
    ausbitbank: 100000,
    "state-tester": 1000000
  },
  dex: {},
  granters: {},
  rewardPool: 100000,
  granterVotes: {},
  communities: {}
};

const genesisBlock = 28934806;

module.exports = {
  state: genesisState,
  block: genesisBlock
}
