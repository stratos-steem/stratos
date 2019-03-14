const communityIdAlphabet = '-.abcdefghijklmnopqrstuvwxyz0123456789';
const communityMinLength = 3;
const communityMaxLength = 20;

const community = {
  type: 'string',
  alphabet: communityIdAlphabet,
  minLength: communityMinLength,
  maxLength: communityMaxLength
}

const grantRole = {
  type: 'object',
  community: community,
  receiver: {
    type: 'string'
  },
  role: {
    type: 'string'
  }
}

const removeRole = {
  type: 'object',
  community: community,
  receiver: {
    type: 'string'
  },
  role: {
    type: 'string'
  }
}

const bulkRoleUpdate = {
  type: 'object',

  community: community,
  operations: {
    type: 'array',

    element: {
      type: 'object',

      updateType: {
        type: 'string'
      },
      receiver: {
        type: 'string'
      },
      role: {
        type: 'string'
      }
    }
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
  community: community
}

const featurePost = {
  type: 'object',

  permlink: {
    type: 'string'
  },
  author: {
    type: 'string'
  },
  community: community
}

const updateMeta = {
  type: 'object',

  metadata: {
    type: 'string'
  },
  community: community
}

module.exports = {
  community: community,
  grantRole: grantRole,
  removeRole: removeRole,
  blockPost: blockPost,
  featurePost: featurePost,
  updateMeta: updateMeta,
  bulkRoleUpdate: bulkRoleUpdate
}
