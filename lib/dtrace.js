try {
  module.exports = require('dtrace-provider')
  console.log('Worker Farm: DTrace support loaded')
} catch (e) {
  var noop      = function () {}
    , probeNoop = { fire: noop }
  module.exports = {
      createDTraceProvider: function () {
        return {
            addProbe: function () { return probeNoop }
          , enable: noop
        }
      }
  }
}
