var $module

function handle (data) {
  var idx      = data.idx
    , child    = data.child
    , method   = data.method
    , args     = data.args
    , callback = function () {
        process.send({
            idx   : idx
          , child : child
          , args  : Array.prototype.slice.call(arguments)
        })
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

process.on('message', function (data) {
  if (!$module) return $module = require(data.module)
  if (data == 'die') return process.exit(0)
  handle(data)
})