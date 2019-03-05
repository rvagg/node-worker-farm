'use strict'
let $module
function handle (data, send) {
  let idx      = data.idx
    , child    = data.child
    , method   = data.method
    , args     = data.args
    , callback = function () {
        let _args = Array.prototype.slice.call(arguments)
        if (_args[0] instanceof Error) {
          let e = _args[0]
          _args[0] = {
              '$error'  : '$error'
            , 'type'    : e.constructor.name
            , 'message' : e.message
            , 'stack'   : e.stack
          }
          Object.keys(e).forEach(function(key) {
            _args[0][key] = e[key]
          })
        }
        send({ idx: idx, child: child, args: _args })
      }
    , exec

  if (method == null && typeof $module == 'function')
    exec = $module
  else if (typeof $module[method] == 'function')
    exec = $module[method]

  if (!exec)
    return console.error('NO SUCH METHOD:', method)

  exec.apply(null, args.concat([ callback ]))
}

module.exports = function(send) {
  return function(data) {
    if (!$module) return $module = require(data.module)
    if (data == 'die') return process.exit(0)
    handle(data, send)
  }
}