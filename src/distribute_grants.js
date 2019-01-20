/*
  Grant Distribution
  ---

  Implementation of Stratos grant distribution, as seen in Steem post
  https://steemit.com/steem/@shredz7/a-model-for-a-decentralized-open-company-stratos-update

  
*/

const maxGranters = 3;

function distributeGrants(state, block) {
  if(!state.rewardPool) {
    console.error("Error: state.rewardPool is undefined.");
  }

  console.log('Distributing daily grants, reward pool is', state.rewardPool);

  // Next we will add up all stake of all voters for each granter, and the top
  // [maxGranters] granters will split the reward pool.

  const granterVoteCount = {};

  for (var granter in state.granters) { // Set all granters' vote count to 0
    granterVoteCount[granter] = 0;
  }

  for (var voter in state.granterVotes) {
    for (var i in state.granterVotes[voter]) {
      const granter = state.granterVotes[voter][i];
      if(state.granters[granter] !== undefined) { // If the user voted for is actually a granter
        granterVoteCount[granter] += state.balances[voter] || 0;
      }
    }
  }

  const granterArray = [];  // We need to turn the granterVoteCount object into an array to sort.

  for (var granter in granterVoteCount) {
    granterArray.push({granter: granter, votes: granterVoteCount[granter]});
  }

  const sortedGranters = granterArray.sort(function (a, b) {
    const difference = b.votes - a.votes;

    if(difference === 0) {        // If no difference, rely on alphabetical order.
      return a.granter > b.granter;
    }

    return difference;
  });

  const topGranters = sortedGranters.slice(0, maxGranters);

  // Distribute rewards
  if(topGranters.length !== 0) {
    const rewardPerGranter = Math.floor(state.rewardPool/topGranters.length);

    for(granterNum in topGranters) {
      const granter = topGranters[granterNum].granter;
      console.log("Top granter",granter,"received",rewardPerGranter);

      if(state.balances[granter] === undefined) {
        state.balances[granter] = 0;
      }

      state.balances[granter] += rewardPerGranter;
    }
  }

  state.rewardPool = getRewardPool(block);
  return state;
}

// Placeholder reward pool function. Actual function TBD.
function getRewardPool(block) {
  return 0;
}



module.exports = distributeGrants;
