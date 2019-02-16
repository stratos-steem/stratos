/*
  Index.js
  ---

  Sets up state storage in memory and in files, runs distribute_grants, sets
  up APIs, CLI, and operation events by utilizing files in src/apps/
*/

const steem = require('dsteem');
const steemState = require('steem-state');
const steemTransact = require('steem-transact');
const readline = require('readline');
const fs = require('fs');
var app = require('express')();
const bodyParser = require('body-parser');
const cors = require('cors')
const hash = require('object-hash');
const constants = require('constants');


const genesis = require('./genesis');
const dex = require('./apps/dex');
const token = require('./apps/token');
const grantVoting = require('./apps/grant-voting');
const communities = require('./apps/communities');

const distributeGrants = require('./distribute_grants');

/*
  This prevents crashing when using nohup command
*/
process.stdin.on('error', function(error) {
  if (error.errno == constants.EBADF) {
      console.log('stdin is unusable');
  } else {
      console.log('stdin error! ' + error);
  }
});


const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const stateStoreFile = __dirname + '/../state.json'
const stateHistoryDirectory = __dirname + '/../states/'

const genesisBlock = genesis.block;
var state = genesis.state;
var lastCheckpointHash = hash(state);
var consensusDisagreements = {} // Counts disagreements on checkpoint states

function getState() {
  return state;
}

function setState(value) {
  state = value;
}

const prefix = 'stratos_'
const checkpointDelay = 200; // Every 10 minutes

const postConsensusCheck = process.env.CONSENSUS_CHECKS === 'true'

const streamMode = process.env.STREAM_MODE || 'irreversible'  // Stream irreversible or latest?
console.log('Using mode', streamMode)
const rpcEndpoint = process.env.RPC_ENDPOINT || 'https://rpc.usesteem.com'   // Use which client?
console.log('Using endpoint', rpcEndpoint)
const saveStateHistory = ('true' === process.env.SAVE_STATE_HISTORY)  // Whether to store a record of the history of the state; if true saves state every 100 blocks into states/ directory
                                                                      // Converts save_state_history to true/false
const networkId = process.env.NETWORK_ID || '0' // Which network id to use? 0 is the mainnet, 1+ are testnets.
console.log('Using network id', networkId)
const fullPrefix = prefix + networkId + '_' // prefix + networkId = fullPrefix

const noSync = process.env.NOSYNC === 'true'; // If this is true, then does not attempt to sync to latest block, just starts at current block. This is not secure and only for testing.
const port = process.env.PORT || 3000

const username = process.env.ACCOUNT
const key = process.env.KEY     // Above account's private posting key

const client = new steem.Client(rpcEndpoint)

console.log()

function startApp(startingBlock) {
  var processor;
  processor = steemState(client, steem, startingBlock, 0, fullPrefix, streamMode)
  processor = steemState(client, steem, startingBlock, 0, fullPrefix, streamMode)

  const transactor = steemTransact(client, steem, fullPrefix);

  processor.onBlock(function(num, block) {
    if(num % 100 === 0 && !processor.isStreaming()) { // Print out data to user about how far until real-time
      client.database.getDynamicGlobalProperties().then(function(result) {
        console.log('At block', num, 'with', result.head_block_number-num, 'left until real-time.')
        console.log()
      });
    }

    if(num % 100 === 0) {
      saveState(num, state)
    }

    if(num % checkpointDelay === 0) {
      lastCheckpointHash = hash(state);
      if(processor.isStreaming() && postConsensusCheck) {
        console.log('Posting consensus check')

        transactor.json(username, key, 'consensus_check', lastCheckpointHash, function(err, result) {
          if(err) {
            console.error(err);
          }
        });
      }
    }
    //if(num % 100 === 0) { // For grant distribution testing
    if(num % 28800 === 0) { // Every day
      state = distributeGrants(state, num);
    }

    if(num % 9600 === 0) { // 3x per day
      communities.updateDailyPosts(num, getState);
    }

    if(num % 9600 + 4800 === 0) { // 3x per day but offset from update daily posts
      communities.updateWeeklyUsers(num, getState);
    }
  });

  processor.on('consensus_check', function(json, from) {
    if(typeof json === typeof 'string') {
      if(json === lastCheckpointHash) {
        console.log('In agreement with', from);
      } else {
        console.error('Disagreed with', from, '');
        if(!consensusDisagreements[from]) consensusDisagreements[from] = 0;
        consensusDisagreements[from]++;
      }
    } else {
      console.log('Invalid consensus check by', from)
    }
  });

  processor.onStreamingStart(function() {
    console.log("At real time.")
  });

  processor = token.app(processor,getState,setState, fullPrefix);
  processor = dex.app(processor,getState,setState, fullPrefix, communities);
  processor = grantVoting.app(processor, getState, setState, fullPrefix);
  processor = communities.app(processor, getState, setState, fullPrefix);
  communities.database.setup(function() {
    console.log('DB synced.');
    processor.start();
    console.log('Started state processor.');
  }); // Setup DB then start state processor

  var inputToFunction = {}    // An input action cooresponds to a function

  const inputInterface = {    // Interface to 'apps' for setting inputToFunction
    on: (id, functionToCall) => {
      inputToFunction[id] = functionToCall;
    }
  }

  inputInterface.on('state', function() {
    console.log(JSON.stringify(state, null, 2));
  });

  inputInterface.on('consensus', function() {
    for(user in consensusDisagreements) {
      console.log(user, 'had', consensusDisagreements[user], 'disagreements');
    }
  });

  token.cli(inputInterface, getState);
  dex.cli(inputInterface, getState);
  grantVoting.cli(inputInterface, getState);
  communities.cli(inputInterface, getState, fullPrefix);


  rl.on('line', function(data) {
    const split = data.split(' ');
    if(typeof inputToFunction[split[0]] === 'function') {
      const funcToCall = inputToFunction[split[0]];
      split.shift(); // Remove split[0]
      funcToCall(split, transactor, username, key, client, steem);
    } else {
      console.log("Invalid command.");
    }
  });

  app.use(bodyParser.json());
  app.use(cors());

  app.get('/', (req, res, next) => {
    res.send(JSON.stringify({block: processor.getCurrentBlockNumber(), latest: processor.isStreaming(), network: networkId}, null, 2))
  });

  app.get('/state', (req, res, next) => {
    res.send(JSON.stringify([processor.getCurrentBlockNumber(),state], null, 2))
  });

  app.get('/consensus', (req, res, next) => {
    res.send(JSON.stringify(consensusDisagreements, null, 2))
  });

  app = token.api(app, getState);
  app = dex.api(app, getState);
  app = grantVoting.api(app, getState);
  app = communities.api(app, getState, fullPrefix);

  app.listen(port, function() {
    console.log(`stratos API listening on port ${port}!`)
  })
}

function saveState(currentBlock, currentState) { // Saves the state along with the current block number to be recalled on a later run.
  const data = JSON.stringify([currentBlock, lastCheckpointHash, currentState, consensusDisagreements])

  fs.writeFile(stateStoreFile, data, (err) => {
    if (err) throw err;
    console.log('Saved state.');
  });

  if(saveStateHistory && currentBlock % 10000 === 0) {
    try {
      fs.mkdirSync(stateHistoryDirectory)
    } catch (err) {
      if (err.code !== 'EEXIST') throw err
    }

    fs.writeFile(stateHistoryDirectory + 'state' + currentBlock + '.json', data, (err) => {
      if (err) throw err;
      console.log('Saved state history.');
    });
  }
}

if(noSync) {
  client.database.getDynamicGlobalProperties().then(function(result) {
    console.log('WARNING - NOSYNC IS ENABLED. THIS IS NOT SECURE AND IS ONLY FOR TESTING.')
    if(fs.existsSync(stateStoreFile)) {
      const data = fs.readFileSync(stateStoreFile, 'utf8');
      const json = JSON.parse(data);
      state = json[2]; // The state will be set to the one linked to the starting block.
      lastCheckpointHash = json[1];
      consensusDisagreements = json[3];
      startApp(result.head_block_number);
    } else {
      console.log('No state store file found. Starting from the genesis state (this is not a warning, everything is OK, this is to be expected)');
      startApp(result.head_block_number);
    }
  });
} else {
  if(fs.existsSync(stateStoreFile)) { // If we have saved the state in a previous run
    const data = fs.readFileSync(stateStoreFile, 'utf8');
    const json = JSON.parse(data);
    const startingBlock = json[0];  // This will be read by startApp() to be the block to start on
    state = json[2]; // The state will be set to the one linked to the starting block.
    lastCheckpointHash = json[1];
    consensusDisagreements = json[3];
    startApp(startingBlock)
  } else {   // If this is the first run
    console.log('No state store file found. Starting from the genesis block + state (this is not a warning, everything is OK, this is to be expected)');
    const startingBlock = genesisBlock;  // Simply start at the genesis block.
    startApp(startingBlock);
  }
}
