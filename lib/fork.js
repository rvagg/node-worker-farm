const childProcess = require('child_process')
    , childModule  = require.resolve('./child/index')

function fork (forkModule) {
  // suppress --debug flags while preserving others (like --harmony)
  var filteredArgs = process.execArgv.filter(function (v) {
    return v.indexOf('--debug') === -1
  })

  var child = childProcess.fork(childModule, {execArgv: filteredArgs}, {
          env: process.env
        , cwd: process.cwd()
      })

  child.send({ module: forkModule })

  // return a send() function for this child
  return {
      send  : function (data) {
        try {
          child.send(data)
        } catch (e) {
          // this *should* be picked up by onExit and the operation requeued
        }
      }
    , child : child
  }
}

module.exports = fork
