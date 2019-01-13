const steem = require('dsteem');
const steemState = require('steem-state');
const steemTransact = require('steem-transact');
const readline = require('readline');
const fs = require('fs');
var app = require('express')();
const bodyParser = require('body-parser');

const genesis = require('./genesis');
const dex = require('./apps/dex');
const token = require('./apps/token');
const grantVoting = require('./apps/grant-voting');

const distributeGrants = require('./distribute_grants');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const stateStoreFile = __dirname + '/../state.json'
const stateHistoryDirectory = __dirname + '/../states/'

const genesisBlock = genesis.block;
var state = genesis.state;

function getState() {
  return state;
}

function setState(value) {
  state = value;
}

const prefix = 'stratos_'

const streamMode = process.env.STREAM_MODE || 'irreversible'  // Stream irreversible or latest?
console.log('Using mode', streamMode)
const rpcEndpoint = process.env.RPC_ENDPOINT || 'https://api.steemit.com'   // Use which client?
console.log('Using endpoint', rpcEndpoint)
const saveStateHistory = ('true' === process.env.SAVE_STATE_HISTORY)  // Whether to store a record of the history of the state; if true saves state every 100 blocks into states/ directory
                                                                      // Converts save_state_history to true/false
const networkId = process.env.NETWORK_ID || '0' // Which network id to use? 0 is the mainnet, 1+ are testnets.
console.log('Using network id', networkId)
const fullPrefix = prefix + networkId + '_' // prefix + networkId = fullPrefix

const port = process.env.PORT || 3000

const username = process.env.ACCOUNT
const key = process.env.KEY     // Above account's private posting key

const client = new steem.Client(rpcEndpoint)

console.log()

function startApp(startingBlock) {
  var processor = steemState(client, steem, startingBlock, 0, fullPrefix, streamMode)

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
    //if(num % 100 === 0) { // For grant distribution testing
    if(num % 28800 === 0) { // Every day
      state = distributeGrants(state, num);
    }
  });

  processor.onStreamingStart(function() {
    console.log("At real time.")
  });

  processor = token.app(processor,getState,setState, fullPrefix);
  processor = dex.app(processor,getState,setState, fullPrefix);
  processor = grantVoting.app(processor, getState, setState, fullPrefix);

  processor.start();
  console.log('Started state processor.');

  const transactor = steemTransact(client, steem, fullPrefix);

  var inputToFunction = {}    // An input action cooresponds to a function

  const inputInterface = {    // Interface to 'apps' for setting inputToFunction
    on: (id, functionToCall) => {
      inputToFunction[id] = functionToCall;
    }
  }

  inputInterface.on('state', function() {
    console.log(JSON.stringify(state, null, 2));
  });

  token.cli(inputInterface, getState);
  dex.cli(inputInterface, getState);
  grantVoting.cli(inputInterface, getState);


  rl.on('line', function(data) {
    const split = data.split(' ');
    if(typeof inputToFunction[split[0]] === 'function') {
      const funcToCall = inputToFunction[split[0]];
      split.shift(); // Remove split[0]
      funcToCall(split, transactor, username, key);
    } else {
      console.log("Invalid command.");
    }
  });

  app.use(bodyParser.json());

  app.get('/', (req, res, next) => {
    res.send(JSON.stringify({block: processor.getCurrentBlockNumber(), latest: processor.isStreaming()}, null, 2))
  });

  app.get('/state', (req, res, next) => {
    res.send(JSON.stringify([processor.getCurrentBlockNumber(),state], null, 2))
  });

  app = token.api(app, getState);
  app = dex.api(app, getState);
  app = grantVoting.api(app, getState);

  app.listen(port, function() {
    console.log(`stratos API listening on port ${port}!`)
  })
}

function saveState(currentBlock, currentState) { // Saves the state along with the current block number to be recalled on a later run.
  const data = JSON.stringify([currentBlock, currentState])

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


if(fs.existsSync(stateStoreFile)) { // If we have saved the state in a previous run
  const data = fs.readFileSync(stateStoreFile, 'utf8');
  const json = JSON.parse(data);
  const startingBlock = json[0];  // This will be read by startApp() to be the block to start on
  state = json[1]; // The state will be set to the one linked to the starting block.
  startApp(startingBlock);
} else {   // If this is the first run
  console.log('No state store file found. Starting from the genesis block + state (this is not a warning, everything is OK, this is to be expected)');
  const startingBlock = genesisBlock;  // Simply start at the genesis block.
  startApp(startingBlock);
}
