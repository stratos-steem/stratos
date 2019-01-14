const matcher = require('match-schema');
const schemas = require('./schemas');

function app(processor, getState, setState, prefix) {
  return processor;
}

function cli(input, getState) {

}

function api(app, getState) {
  return app;
}

module.exports = {
  app: app,
  cli: cli,
  api: api
}
