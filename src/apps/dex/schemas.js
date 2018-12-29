const sell_order = {
  type: 'object',
  engine: {
    type: 'number',
    requires: [
      'nonnegative',
      'integer'
    ]
  },
  steem: {
    type: 'number',
    requires: [
      'nonnegative',
      'integer'
    ]
  }
}

const cancel_sell = {
  type: 'object',
  id: {
    type: 'number',
    requires: [
      'nonnegative',
      'integer'
    ]
  }
}

const buy = {
  type: 'object'
}

module.exports = {
  sell_order: sell_order,
  cancel_sell: cancel_sell,
  buy: buy
}
