/*
  A dummy api steem-state used for testing purposes. Apps can add operations,
  then tests can trigger operations to happen (through functions like
  triggerCustomJson) which then are processed as if they were actual operations
  on the blockchain.
*/

function generateSteemStateClone() {
  const onCustomJsonOperation = {}
  const onOperation = {}

  return {
    on: function(id, callback) {
      onCustomJsonOperation[id] = callback
    },
    onNoPrefix: function(id, callback) {
      onCustomJsonOperation[id] = callback
    },
    onOperation: function(type, callback) {
      onOperation[type] = callback
    },

    triggerCustomJson: function(id, from, json) {
      onCustomJsonOperation[id](json, from)
    },
    triggerOperation: function(id, json) {
      onOperation[id](json)
    }
  }
}

module.exports = generateSteemStateClone;
