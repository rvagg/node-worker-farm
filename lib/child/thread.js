'use strict'
const handle = require('./handle')
const {parentPort} = require('worker_threads')
parentPort.on('message', handle(parentPort.postMessage.bind(parentPort)))
