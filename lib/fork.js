'use strict'

const childProcess = require('child_process')
    , childModule  = require.resolve('./child/index')

let checked, available
function fork (forkModule, workerOptions, workerThreads) {

  // Check whether we need to run using worker_threads.
  if (workerThreads) {

    if (!checked) {
      try {
        require('worker_threads')
        available = true
      } catch (e) {
        available = false
        console.warn('[WARNING] Worker threads are not available! Make sure you run node 10.x or higher with --experimental-worker!')
      }
      checked = true
    }

    if (available) {
      return thread(forkModule, workerOptions);
    }
  }

  // suppress --debug / --inspect flags while preserving others (like --harmony)
  let filteredArgs = process.execArgv.filter(function (v) {
        return !(/^--(debug|inspect)/).test(v)
      })
    , options       = Object.assign({
          execArgv : filteredArgs
        , env      : process.env
        , cwd      : process.cwd()
      }, workerOptions)
    , child         = childProcess.fork(childModule, process.argv, options)

  child.on('error', function() {
    // this *should* be picked up by onExit and the operation requeued
  })

  child.send({ module: forkModule })

  // return a send() function for this child
  return {
      send  : child.send.bind(child)
    , child : child
  }
}

function thread (forkModule, workerOptions) {
  const {Worker} = require('worker_threads');
  let child = new Worker(require.resolve('./child/thread'), workerOptions)
  child.on('error', function() {})
  child.postMessage({ module: forkModule })
  return {
      send  : child.postMessage.bind(child)
    , child : child
  }
}

module.exports = fork
