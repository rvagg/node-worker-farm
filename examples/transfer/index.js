'use strict'

// Beware! Run with node 12.x or higher, or 10.5 with --experimental-worker
let workerFarm = require('../../')
  , workers    = workerFarm.threaded(require.resolve('./child'))
  , ret				 = 0
  , n 				 = 100
  , size			 = 5*1024*1024

;(async function() {

	console.time('With transferList')
	await new Promise(function(resolve, reject) {
		for (let i = 0; i < n; i++) {
			let data = new Uint32Array([size])
		  workers(data, true, function(err, result) {
		  	if (++ret == n)
		  		resolve()
		  }, [data.buffer])
		}
	})
	console.timeEnd('With transferList')

	ret = 0

	console.time('Without transferList')
	await new Promise(function(resolve, reject) {
		for (let i = 0; i < n; i++) {
			let data = new Uint32Array([size])
			workers(data, false, function(err, result) {
				if (++ret == n)
					resolve()
			})
		}
	})
	console.timeEnd('Without transferList')

	workerFarm.end(workers)

})().catch(console.error)