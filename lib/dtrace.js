try {
  module.exports = require('dtrace-provider')
  console.log('Worker Farm: DTrace support loaded')
} catch (e) {
  var noop = function () {}
  module.exports = {
      createDTraceProvider: function () {
        return {
            addProbe: function () {
              return { fire: noop }
            }
          , enable: noop
        }
      }
  }
}
