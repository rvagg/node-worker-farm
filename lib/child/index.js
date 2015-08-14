const EventEmitter2 = require('eventemitter2').EventEmitter2

var $module
  , emitters = []

/*
  var contextProto = this.context;
  while (contextProto = Object.getPrototypeOf(contextProto)) {
    completionGroups.push(Object.getOwnPropertyNames(contextProto));
  }
*/

function handleCall (data) {
  var idx      = data.idx
    , child    = data.child
    , method   = data.method
    , args     = data.args
    , callback = function () {
        var _args = Array.prototype.slice.call(arguments)
        if (_args[0] instanceof Error) {
          var e = _args[0]
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
        ;delete emitters[idx];
        process.send({ idx: idx, child: child, args: _args })
      }
    , exec
    , emitter

  if (method == null && typeof $module == 'function')
    exec = $module
  else if (typeof $module[method] == 'function')
    exec = $module[method]

  if (!exec)
    return console.error('NO SUCH METHOD:', method)

  // start listening for all events from the worker to forward them to the farm
  emitter = emitters[idx] = new EventEmitter2({wildcard:true});
  emitter.on('worker.*', function () {
    process.send({
        idx    : idx
      , child  : child
      , event  : this.event
      , args   : Array.prototype.slice.call(arguments)
    })
  })

  exec.apply(emitter, args.concat([ callback ]))
}

function handleEvent (data) {
  var idx      = data.idx
    , child    = data.child
    , event    = data.event
    , args     = data.args
    , emitter  = emitters[idx]

  if (!emitter)
    return console.error('UNKNOWN CALL')

  args.unshift(event);
  emitter.emit.apply(emitter, args);
}

process.on('message', function (data) {
  if (!$module) return $module = require(data.module)
  if (data == 'die') return process.exit(0)
  if (data.event) return handleEvent(data);
  handleCall(data)
})
