
function app(processor, getState, setState) {
  processor.on('dex_sell_order', function(json, from) {
    console.log(from, 'created sell order')
  })

  return processor
}

function cli(input, getState) {
  input.on('dex_sell_order', function(args,transactor) {
    console.log('Creating sell order...')
  })
}

module.exports = {
  app: app,
  cli: cli
}
