const expect = require('chai').expect

const dummySteemState = require('./steem-state-clone')
const communities = require('../src/apps/communities')


describe('communities', function() {
  var processor;
  var state;

  function getState() {
    return state;
  }
  function setState(value) {
    state = value;
  }


  beforeEach(function () {
    processor = dummySteemState();    // Initialize a dummy steem state to use to trigger transactions artificially
    communities.app(processor, getState, setState,'test_prefix_');    // Initialize communities
  });

  it('Creates a community successfully', function() {
    state = {
      communities: {}
    }

    processor.triggerCustomJson('cmmts_create', 'alice', {
      id: 'test-community'
    })

    expect(state.communities['test-community'].roles.owner[0]).to.eql('alice');
  })

  it('Does not create a community with invalid id', function() {
    state = {
      communities: {}
    }

    processor.triggerCustomJson('cmmts_create', 'alice', {
      id: 'invalID iD #$@QE@#!_'
    })

    expect(state.communities['test-community']).to.equal(undefined);
  })

  it('Successfully grants roles to users', function() {
    state = {
      communities: {
        test: {
          roles: {
            owner: ['alice'],
            admin: [],
            mod: [],
            author: []
          }
        }
      }
    }

    processor.triggerCustomJson('cmmts_grant_role', 'alice', {
      community: 'test',
      receiver: 'bob',
      role: 'admin'
    });

    expect(state.communities.test.roles.admin[0]).to.eql('bob');

    processor.triggerCustomJson('cmmts_grant_role', 'bob', {
      community: 'test',
      receiver: 'carl',
      role: 'mod'
    });

    expect(state.communities.test.roles.mod[0]).to.eql('carl');

    processor.triggerCustomJson('cmmts_grant_role', 'carl', {
      community: 'test',
      receiver: 'dan',
      role: 'author'
    });

    expect(state.communities.test.roles.author[0]).to.eql('dan');
  })

  it('Does not grant roles to unauthorized users', function() {
    state = {
      communities: {
        test: {
          roles: {
            mod: ['alice'],
            admin: [],
            owner: [],
            author: []
          }
        }
      }
    };

    processor.triggerCustomJson('cmmts_grant_role', 'alice', {
      community: 'test',
      receiver: 'bob',
      role: 'admin'
    });

    expect(state.communities.test.roles.admin.length).to.equal(0);
  });

  it('Removes roles', function() {
    state = {
      communities: {
        test: {
          roles: {
            admin: [],
            owner: [],
            mod: ['alice'],
            author: ['bob']
          }
        }
      }
    };

    processor.triggerCustomJson('cmmts_remove_role', 'alice', {
      community: 'test',
      receiver: 'bob',
      role: 'author'
    });

    expect(state.communities.test.roles.author.length).to.equal(0);
  });
});
