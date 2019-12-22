'use strict'
const {threadId} = require('worker_threads')

module.exports = function (inp, callback) {
	callback(null, inp + ' BAR (' + [process.pid, threadId].join(':') + ')')
}