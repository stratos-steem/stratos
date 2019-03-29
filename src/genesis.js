// Contains the constants which determine the original state and the block the network starts at.

const genesisState = {
  balances: {},
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
