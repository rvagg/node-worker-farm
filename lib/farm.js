const DEFAULT_OPTIONS = {
          maxCallsPerWorker           : -1
        , maxConcurrentWorkers        : require('os').cpus().length
        , maxConcurrentCallsPerWorker : 10
        , maxCallTime                 : 0 // exceed this and the whole worker is terminated
      }

const extend       = require('xtend')
    , TimeoutError = require('errno').create('TimeoutError')
    , fork         = require('./fork')

function Farm (options, path) {
  this.options = extend(DEFAULT_OPTIONS, options)
  this.path = path
}

// make a handle to pass back in the form of an external API
Farm.prototype.mkhandle = function (method) {
  return function () {
    var args = Array.prototype.slice.call(arguments)
    this.addCall({
        method   : method
      , callback : args.pop()
      , args     : args
    })
  }.bind(this)
}

// a constructor of sorts
Farm.prototype.setup = function (methods) {
  var iface
  if (!methods) { // single-function export
    iface = this.mkhandle()
  } else { // multiple functions on the export
    iface = {}
    methods.forEach(function (m) {
      iface[m] = this.mkhandle(m)
    }.bind(this))
  }

  this.searchStart    = -1
  this.childId        = -1
  this.children       = {}
  this.activeChildren = 0
  this.callQueue      = []

  return iface
}

// when a child exits, check if there are any outstanding jobs and requeue them
Farm.prototype.onExit = function (childId) {
  // delay this to give any sends a chance to finish
  setTimeout(function () {
    var doQueue = false
    if (this.children[childId] && this.children[childId].activeCalls) {
      this.children[childId].calls.reverse().forEach(function (call) {
        if (call) {
          this.callQueue.unshift(call)
          doQueue = true
        }
      }.bind(this))
    }
    this.stopChild(childId)
    doQueue && this.processQueue()
  }.bind(this), 10)
}

// start a new worker
Farm.prototype.startChild = function () {
  this.children[++this.childId] = {
      send        : fork(this.path, this.receive.bind(this), this.onExit.bind(this, this.childId))
    , calls       : []
    , activeCalls : 0
  }
  this.activeChildren++
}

// stop a worker, identified by id
Farm.prototype.stopChild = function (child) {
  if (this.children[child]) {
    this.children[child].send('die')
    ;delete this.children[child]
    this.activeChildren--
  }
}

// called from a child process, the data contains information needed to
// look up the child and the original call so we can invoke the callback
Farm.prototype.receive = function (data) {
  var idx     = data.idx
    , childId = data.child
    , args    = data.args
    , child   = this.children[childId]
    , call

  if (!child) {
    return console.error(
        'Worker Farm: Received message for unknown child. '
      + 'This is likely as a result of premature child death, '
      + 'the operation will have been re-queued.'
    )
  }

  call = child.calls[idx]
  if (!call) {
    return console.error(
        'Worker Farm: Received message for unknown index for existing child. '
      + 'This should not happen!'
    )
  }

  if (this.options.maxCallTime > 0)
    clearTimeout(call.timer)

  process.nextTick(function () {
    call.callback.apply(null, args)
  })

  ;delete child.calls[idx]
  child.activeCalls--

  if (this.options.maxCallsPerWorker != -1
      && child.calls.length >= this.options.maxCallsPerWorker
      && !Object.keys(child.calls).length) {
    // this child has finished its run, kill it
    this.stopChild(childId)
  }

  // allow any outstanding calls to be processed
  this.processQueue()
}

Farm.prototype.childTimeout = function (childId) {
  var child = this.children[childId]
    , i

  if (!child)
    return

  for (i in child.calls) {
    this.receive({
        idx   : i
      , child : childId
      , args  : [ new TimeoutError('worker call timed out!') ]
    })
  }
  this.stopChild(childId)
}

// send a call to a worker, identified by id
Farm.prototype.send = function (childId, call) {
  var child = this.children[childId]
    , idx   = child.calls.length

  child.calls.push(call)
  child.activeCalls++

  child.send({
      idx    : idx
    , child  : childId
    , method : call.method
    , args   : call.args
  })

  if (this.options.maxCallTime > 0) {
    call.timer =
      setTimeout(this.childTimeout.bind(this, childId), this.options.maxCallTime)
  }
}

// a list of active worker ids, in order, but the starting offset is
// shifted each time this method is called, so we work our way through
// all workers when handing out jobs
Farm.prototype.childKeys = function () {
  var cka = Object.keys(this.children)
    , cks

  if (this.searchStart >= cka.length - 1)
    this.searchStart = 0
  else
    this.searchStart++

  cks = cka.splice(0, this.searchStart)

  return cka.concat(cks)
}

// Calls are added to a queue, this processes the queue and is called
// whenever there might be a chance to send more calls to the workers.
// The various options all impact on when we're able to send calls,
// they may need to be kept in a queue until a worker is ready.
Farm.prototype.processQueue = function () {
  var cka, i = 0, childId

  if (!this.callQueue.length)
    return this.ending && this.end()

  if (this.activeChildren < this.options.maxConcurrentWorkers)
    this.startChild()

  for (cka = this.childKeys(); i < cka.length; i++) {
    childId = +cka[i]
    if ((this.options.maxConcurrentCallsPerWorker == -1
        || this.children[childId].activeCalls < this.options.maxConcurrentCallsPerWorker)
        && (this.options.maxCallsPerWorker == -1
          || this.children[childId].calls.length < this.options.maxCallsPerWorker)) {

      this.send(childId, this.callQueue.shift())
      if (!this.callQueue.length)
        return this.ending && this.end()
    } /*else {
      console.log(
          this.options.maxConcurrentCallsPerWorker == -1
        , this.children[childId].activeCalls < this.options.maxConcurrentCallsPerWorker
        , this.options.maxCallsPerWorker == -1
        , this.children[childId].calls.length < this.options.maxCallsPerWorker
        , this.children[childId].calls.length , this.options.maxCallsPerWorker)
    }*/
  }

  if (this.ending)
    this.end()
}

// add a new call to the call queue, then trigger a process of the queue
Farm.prototype.addCall = function (call) {
  if (this.ending)
    return this.end() // don't add anything new to the queue
  this.callQueue.push(call)
  this.processQueue()
}

// kills child workers when they're all done
Farm.prototype.end = function (callback) {
  var complete = true
  if (this.ending === false)
    return
  if (callback)
    this.ending = callback
  else if (this.ending == null)
    this.ending = true
  Object.keys(this.children).forEach(function (child) {
    if (!this.children[child])
      return
    if (!this.children[child].activeCalls)
      this.stopChild(child)
    else
      complete = false
  }.bind(this))

  if (complete && typeof this.ending == 'function') {
    process.nextTick(function () {
      this.ending()
      this.ending = false
    }.bind(this))
  }
}

module.exports = Farm