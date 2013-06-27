module.exports = function (timeout, callback) {
  callback = callback.bind(null, null, process.pid, Math.random())
  if (timeout)
    return setTimeout(callback, timeout)
  callback()
}

module.exports.run0 = function (callback) {
  module.exports(0, callback)
}

module.exports.killable = function (id, callback) {
  if (Math.random() < 0.5)
    return process.exit(-1)
  callback(null, id, process.pid)
}

module.exports.returnsError = function (callback) {
  callback(new Error('whoops'))
}