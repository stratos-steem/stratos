const send = {
  type: 'object',
  to: {
    type: 'string'
  },
  amount: {
    type: 'number',
    requires: [
      'nonnegative',
      'integer'
    ]
  }
}

module.exports = {
  send: send
}
