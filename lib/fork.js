"use strict";
//
const childProcess = require('child_process')
    , childModule  = require.resolve('./child/index');

const isDebugFork= typeof v8debug !== 'undefined';
let debugPort = 0;

if( isDebugFork ){
    process.execArgv.forEach( ( arg ) => {
        if( arg.indexOf('--debug') !== -1 )
            debugPort= +arg.split('=')[1];
    });
};
function fork (forkModule) {
    //
    let execArgv= isDebugFork ? process.execArgv.map( (arg) => {
        if( arg.indexOf('--debug') !== -1 ){
            arg= arg.split('=');
            arg[0] = '--debug';
            arg[1] = ++debugPort;
            arg= arg.join('=');
        }
        return arg;
    }) : process.execArgv;
    //
  var child = childProcess.fork(childModule, {
          env   : process.env
        , cwd   : process.cwd(),
        execArgv: execArgv
  });

  child.send({ module: forkModule });

  // return a send() function for this child
  return {
      send  : function (data) {
        try {
          child.send(data)
        } catch (e) {
          // this *should* be picked up by onExit and the operation requeued
        }
      }
    , child : child
  }
}

module.exports = fork
