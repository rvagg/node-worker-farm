/* A simple example illustrating how workerFarm reacts to methods
 * that run over the maxCallTime limit. */

var workerFarm = require('../../')
  , workers    = workerFarm({
      maxCallTime: 1000
    }, require.resolve('./loop'))
  , ret        = 0

for (var i = 0; i < 10; i++) {
  workers( null, function (err) {
    if( err ) console.log( 'Worker method timed out:', err );
    if (++ret == 10)
      workerFarm.end(workers)
  })
}