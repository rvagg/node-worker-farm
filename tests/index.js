var tape       = require('tape')
  , workerFarm = require('../')
  , childPath  = require.resolve('./child')

  , uniq = function (ar) {
      var a = [], i, j
      o: for (i = 0; i < ar.length; ++i) {
        for (j = 0; j < a.length; ++j) if (a[j] == ar[i]) continue o
        a[a.length] = ar[i]
      }
      return a
    }

// a child where module.exports = function ...
tape('simple, exports=function test', function (t) {
  t.plan(3)

  var child = workerFarm(childPath)
  child(0, function (err, pid, rnd) {
    t.ok(pid > process.pid, 'pid makes sense')
    t.ok(pid < process.pid + 100, 'pid makes sense')
    t.ok(rnd > 0 && rnd < 1, 'rnd result makes sense')
  })

  workerFarm.end(child, t.end.bind(t))
})

// a child where we have module.exports.fn = function ...
tape('simple, exports.fn test', function (t) {
  t.plan(3)

  var child = workerFarm(childPath, [ 'run0' ])
  child.run0(function (err, pid, rnd) {
    t.ok(pid > process.pid, 'pid makes sense')
    t.ok(pid < process.pid + 100, 'pid makes sense')
    t.ok(rnd > 0 && rnd < 1, 'rnd result makes sense')
  })

  workerFarm.end(child, t.end.bind(t))
})

// use the returned pids to check that we're using a single child process
// when maxConcurrentWorkers = 1
tape('single worker', function (t) {
  t.plan(1)

  var child = workerFarm({ maxConcurrentWorkers: 1 }, childPath)
    , pids  = []
    , i     = 10

  while (i--) {
    child(0, function (err, pid) {
      pids.push(pid)
      if (pids.length == 10) {
        t.equal(1, uniq(pids).length, 'only a single process (by pid)')
      } else if (pids.length > 10)
        t.fail('too many callbacks!')
    })
  }

  workerFarm.end(child, t.end.bind(t))
})

// use the returned pids to check that we're using two child processes
// when maxConcurrentWorkers = 2
tape('two workers', function (t) {
  t.plan(1)

  var child = workerFarm({ maxConcurrentWorkers: 2 }, childPath)
    , pids  = []
    , i     = 10

  while (i--) {
    child(0, function (err, pid) {
      pids.push(pid)
      if (pids.length == 10) {
        t.equal(2, uniq(pids).length, 'only two child processes (by pid)')
      } else if (pids.length > 10)
        t.fail('too many callbacks!')
    })
  }

  workerFarm.end(child, t.end.bind(t))
})

// use the returned pids to check that we're using a child process per
// call when maxConcurrentWorkers = 10
tape('many workers', function (t) {
  t.plan(1)

  var child = workerFarm({ maxConcurrentWorkers: 10 }, childPath)
    , pids  = []
    , i     = 10

  while (i--) {
    child(1, function (err, pid) {
      pids.push(pid)
      if (pids.length == 10) {
        t.equal(10, uniq(pids).length, 'pids are all the same (by pid)')
      } else if (pids.length > 10)
        t.fail('too many callbacks!')
    })
  }

  workerFarm.end(child, t.end.bind(t))
})

// use the returned pids to check that we're using a child process per
// call when we set maxCallsPerWorker = 1 even when we have maxConcurrentWorkers = 1
tape('single call per worker', function (t) {
  t.plan(1)

  var child = workerFarm({ maxConcurrentWorkers: 1, maxCallsPerWorker: 1 }, childPath)
    , pids  = []
    , i     = 10

  while (i--) {
    child(0, function (err, pid) {
      pids.push(pid)
      if (pids.length == 10) {
        t.equal(10, uniq(pids).length, 'one process for each call (by pid)')
        workerFarm.end(child, t.end.bind(t))
      } else if (pids.length > 10)
        t.fail('too many callbacks!')
    })
  }
})

// use the returned pids to check that we're using a child process per
// two-calls when we set maxCallsPerWorker = 2 even when we have maxConcurrentWorkers = 1
tape('two calls per worker', function (t) {
  t.plan(1)

  var child = workerFarm({ maxConcurrentWorkers: 1, maxCallsPerWorker: 2 }, childPath)
    , pids  = []
    , i     = 10

  while (i--) {
    child(0, function (err, pid) {
      pids.push(pid)
      if (pids.length == 10) {
        t.equal(5, uniq(pids).length, 'one process for each call (by pid)')
        workerFarm.end(child, t.end.bind(t))
      } else if (pids.length > 10)
        t.fail('too many callbacks!')
    })
  }
})

// use timing to confirm that one worker will process calls sequentially
tape('many concurrent calls', function (t) {
  t.plan(1)

  var child = workerFarm({ maxConcurrentWorkers: 1 }, childPath)
    , i     = 10
    , cbc   = 0
    , start = +new Date()

  while (i--) {
    child(100, function () {
      if (++cbc == 10) {
        var time = +new Date() - start
        t.ok(time > 100 && time < 175, 'processed tasks concurrently (' + time + 'ms)')
        workerFarm.end(child, t.end.bind(t))
      } else if (cbc > 10)
        t.fail('too many callbacks!')
    })
  }
})

// use timing to confirm that one child processes calls sequentially with
// maxConcurrentCallsPerWorker = 1
tape('single concurrent call', function (t) {
  t.plan(1)

  var child = workerFarm({ maxConcurrentWorkers: 1, maxConcurrentCallsPerWorker: 1 }, childPath)
    , i     = 10
    , cbc   = 0
    , start = +new Date()

  while (i--) {
    child(10, function () {
      if (++cbc == 10) {
        var time = +new Date() - start
        t.ok(time > 100 && time < 175, 'processed tasks sequentially (' + time + 'ms)')
        workerFarm.end(child, t.end.bind(t))
      } else if (cbc > 10)
        t.fail('too many callbacks!')
    })
  }
})

// use timing to confirm that one child processes *only* 5 calls concurrently
tape('multiple concurrent calls', function (t) {
  t.plan(1)

  var child = workerFarm({ maxConcurrentWorkers: 1, maxConcurrentCallsPerWorker: 5 }, childPath)
    , i     = 10
    , cbc   = 0
    , start = +new Date()

  while (i--) {
    child(50, function () {
      if (++cbc == 10) {
        var time = +new Date() - start
        t.ok(time > 100 && time < 175, 'processed tasks concurrently (' + time + 'ms)')
        workerFarm.end(child, t.end.bind(t))
      } else if (cbc > 10)
        t.fail('too many callbacks!')
    })
  }
})

// call a method that will die with a probability of 0.5 but expect that
// we'll get results for each of our calls anyway
tape('durability', function (t) {
  t.plan(2)

  var child = workerFarm({ maxConcurrentWorkers: 2 }, childPath, [ 'killable' ])
    , ids   = []
    , pids  = []
    , i     = 10

  while (i--) {
    child.killable(i, function (err, id, pid) {
      ids.push(id)
      pids.push(pid)
      if (ids.length == 10) {
        t.ok(uniq(pids).length > 2, 'processed by many (' + uniq(pids).length + ') workers, but got there in the end!')
        t.ok(uniq(ids).length == 10, 'received a single result for each unique call')
        workerFarm.end(child, t.end.bind(t))
      } else if (ids.length > 10)
        t.fail('too many callbacks!')
    })
  }
})

// a callback provided to .end() can and will be called (uses "simple, exports=function test" to create a child)
tape('simple, end callback', function (t) {
  t.plan(4)

  var child = workerFarm(childPath)
  child(0, function (err, pid, rnd) {
    t.ok(pid > process.pid, 'pid makes sense')
    t.ok(pid < process.pid + 100, 'pid makes sense')
    t.ok(rnd > 0 && rnd < 1, 'rnd result makes sense')
  })

  workerFarm.end(child, function() {
    t.pass('an .end() callback was successfully called')
  });
})