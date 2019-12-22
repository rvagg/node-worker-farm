const test = require('.')
const workerFarm = require('..')

test(workerFarm)
try {
	require('worker_threads');
	test(workerFarm.threaded, true)
} catch (e) {}