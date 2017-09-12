'use strict'

const Farm = require('./farm')

let farms = [] // keep record of farms so we can end() them if required


function farm (options, path, methods) {
  if (typeof options == 'string') {
    methods = path
    path = options
    options = {}
  }

  let f   = new Farm(options, path)
    , api = f.setup(methods)

  farms.push({ farm: f, api: api })

  // return the public API
  return api
}

function get (api) {
  for (let i = 0; i < farms.length; i++)
    if (farms[i] && farms[i].api === api)
      return farms[i].farm;
  return null
}


function stdout (api) {
  let farm = get(api);
  if (farm)
    return farm.stdout
  throw new ReferenceError('Worker farm not found!')
}


function stderr (api) {
  let farm = get(api);
  if (farm)
    return farm.stderr
  throw new ReferenceError('Worker farm not found!')
}


function end (api, callback) {
  let farm = get(api);
  if (farm)
    return farm.end(callback)
  process.nextTick(callback.bind(null, new ReferenceError('Worker farm not found!')))
}


module.exports        = farm
module.exports.end    = end
module.exports.stdout = stdout
module.exports.stderr = stderr
