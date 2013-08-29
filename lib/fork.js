const childProcess = require('child_process')
    , childModule  = require.resolve('./child/index')

function fork (forkModule, receive, onExit) {
  var child = childProcess.fork(childModule, {
          env: process.env
        , cwd: process.cwd()
      })

  child.on('message', receive)
  child.on('exit', onExit)
  child.send({ module: forkModule })

  // return a send() function for this child
  return function (data) {
    try {
      child.send(data)
    } catch (e) {
      // this *should* be picked up by onExit and the operation requeued
    }
  }
}

module.exports = fork