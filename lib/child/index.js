'use strict'
const handle = require('./handle')

/*
  let contextProto = this.context;
  while (contextProto = Object.getPrototypeOf(contextProto)) {
    completionGroups.push(Object.getOwnPropertyNames(contextProto));
  }
*/
process.on('message', handle(process.send.bind(process)))
