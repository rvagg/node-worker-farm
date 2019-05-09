'use strict'
const handle = require('./handle')

/*
  let contextProto = this.context;
  while (contextProto = Object.getPrototypeOf(contextProto)) {
    completionGroups.push(Object.getOwnPropertyNames(contextProto));
  }
*/
process.on('message', handle(function(data) {
	// Ignore any additional arguments because process send only allows to 
	// send handles.
	process.send(data)
}))