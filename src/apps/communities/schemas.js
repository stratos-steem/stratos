const createCommunity = {
  type: 'object',
  id: {
    type: 'string',
    alphabet: 'abcdefghijklmnopqrstuvwxyz-'
  }
}

const grantRole = {
  type: 'object',
  community: {
    type: 'string',
    alphabet: 'abcdefghijklmnopqrstuvwxyz-'
  },
  receiver: {
    type: 'string'
  },
  role: {
    type: 'string'
  }
}

module.exports = {
  createCommunity: createCommunity,
  grantRole: grantRole
}
