'use strict'

// Beware! Run with node 12.x or higher, or 10.5 with --experimental-worker
let workerFarm = require('../../')
  , workers    = workerFarm.threaded(require.resolve('./child'))
  , ret		   = 0

for (let i = 0; i < 10; i++) {
  workers('#' + i + ' FOO', function(err, outp) {
    console.log(outp)
    if (++ret == 10) 
      workerFarm.end(workers)
  })
}