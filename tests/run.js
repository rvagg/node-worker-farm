const test = require('.')
const workerFarm = require('..')
test(workerFarm)
test(workerFarm.threaded)