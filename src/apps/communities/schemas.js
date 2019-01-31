const communityIdAlphabet = 'abcdefghijklmnopqrstuvwxyz-';

const createCommunity = {
  type: 'object',
  id: {
    type: 'string',
    alphabet: communityIdAlphabet
  }
}

const grantRole = {
  type: 'object',
  community: {
    type: 'string',
    alphabet: communityIdAlphabet
  },
  receiver: {
    type: 'string'
  },
  role: {
    type: 'string'
  }
}

const removeRole = {
  type: 'object',
  community: {
    type: 'string',
    alphabet: communityIdAlphabet
  },
  receiver: {
    type: 'string'
  },
  role: {
    type: 'string'
  }
}

const blockPost = {
  type: 'object',

  permlink: {
    type: 'string'
  },
  author: {
    type: 'string'
  },
  community: {
    type: 'string',
    alphabet: communityIdAlphabet
  }
}

const featurePost = {
  type: 'object',

  permlink: {
    type: 'string'
  },
  author: {
    type: 'string'
  },
  community: {
    type: 'string',
    alphabet: communityIdAlphabet
  }
}

const updateMeta = {
  type: 'object',

  metadata: {
    type: 'string'
  }
}

module.exports = {
  createCommunity: createCommunity,
  grantRole: grantRole,
  removeRole: removeRole,
  blockPost: blockPost,
  featurePost: featurePost,
  updateMeta: updateMeta
}
