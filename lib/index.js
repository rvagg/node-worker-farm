const DEFAULT_OPTIONS = {
         maxCallsPerWorker           : -1
       , maxConcurrentWorkers        : require('os').cpus().length
       , maxConcurrentCallsPerWorker : 10
     }
   , extend           = require('util')._extend
   , Farm             = require('./farm')
   , farms            = [] // keep record of farms so we can end() them if required

var farm = function (options, path, methods) {
      var farm

      if (typeof options == 'string') {
        methods = path
        path = options
        options = {}
      }

      options = extend(Object.create(DEFAULT_OPTIONS), options)

      farm = Object.create(Farm, {
          options : { writable: false, value: options }
        , path    : { writable: false, value: path }
      })

      farms.push({ farm: farm, api: farm.setup(methods) })

      // return the public API
      return farms[farms.length - 1].api
    }

  , end = function (api, callback) {
      for (var i = 0; i < farms.length; i++)
        if (farms[i] && farms[i].api === api)
          return farms[i].farm.end(callback)
      process.nextTick(callback.bind(null, 'Worker farm not found!'))
    }

module.exports     = farm
module.exports.end = end