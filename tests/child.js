'use strict'

const fs = require('fs')
const started = Date.now()

// Check if we're running as a worker thread or child process. It doesn't make 
// much sense to send along the process id for worker threads because it will 
// be the same as the on in the main thread.
let pid = process.pid
try {
  const {threadId, isMainThread} = require('worker_threads')
  if (!isMainThread) {
    pid = threadId
  }
} catch (e) {}

module.exports = function (timeout, callback) {
  callback = callback.bind(null, null, [pid, Math.random(), timeout])
  if (timeout)
    return setTimeout(callback, timeout)
  callback()
}


module.exports.args = function (callback) {
  callback(null, {
      argv     : process.argv
    , cwd      : process.cwd()
    , execArgv : process.execArgv
  })
}


module.exports.run0 = function (callback) {
  module.exports(0, callback)
}


module.exports.killable = function (id, callback) {
  if (Math.random() < 0.5)
    return process.exit(-1)
  callback(null, [id, pid])
}


module.exports.err = function (type, message, data, callback) {
  if (typeof data == 'function') {
    callback = data
    data = null
  } else {
    let err = new Error(message)
    Object.keys(data).forEach(function(key) {
      err[key] = data[key]
    })
    callback(err)
    return
  }

  if (type == 'TypeError')
    return callback(new TypeError(message))
  callback(new Error(message))
}


module.exports.block = function () {
  while (true);
}


// use provided file path to save retries count among terminated workers
module.exports.stubborn = function (path, callback) {
  function isOutdated(path) {
    return ((new Date).getTime() - fs.statSync(path).mtime.getTime()) > 2000
  }

  // file may not be properly deleted, check if modified no earler than two seconds ago
  if (!fs.existsSync(path) || isOutdated(path)) {
    fs.writeFileSync(path, '1')
    process.exit(-1)
  }

  let retry = parseInt(fs.readFileSync(path, 'utf8'))
  if (Number.isNaN(retry))
    return callback(new Error('file contents is not a number'))

  if (retry > 4) {
    callback(null, 12)
  } else {
    fs.writeFileSync(path, String(retry + 1))
    process.exit(-1)
  }
}


module.exports.uptime = function (callback) {
  callback(null, Date.now() - started)
}

module.exports.transfer = function (one, two, callback) {
  let sum = 0
  for (let buffer of [one, two]) {
    for (let value of buffer) sum += value
  }
  let arr = new Uint32Array([sum])
  callback(null, arr, [arr.buffer])
}

module.exports.shared = function (buffer, callback) {
  setTimeout(function() {
    buffer[0] = Math.E
    callback(null)
  }, 15)
}