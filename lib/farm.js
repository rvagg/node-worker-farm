const fork = require('./fork')
    , d = require('./dtrace')
    , dtp = d.createDTraceProvider("node-worker-farm")
    , pStartChild = dtp.addProbe("startChild", "int")
    , pStopChild = dtp.addProbe("stopChild", "int")
    , pOnExit = dtp.addProbe("onExit", "int")

dtp.enable()

var Farm = {
        // make a handle to pass back in the form of an external API
        mkhandle : function (method) {
          return function () {
            var args = Array.prototype.slice.call(arguments)
            this.addCall({
                method   : method
              , callback : args.pop()
              , args     : args
            })
          }.bind(this)
        }

        // a constructor of sorts
      , setup: function (methods) {
          var iface
          if (!methods) { // single-function export
            iface = this.mkhandle()
          } else { // multiple functions on the export
            iface = {}
            methods.forEach(function (m) {
              iface[m] = this.mkhandle(m)
            }.bind(this))
          }

          this.searchStart    = -1
          this.childId        = -1
          this.children       = {}
          this.activeChildren = 0
          this.callQueue      = []

          return iface
        }

        // when a child exits, check if there are any outstanding jobs and requeue them
      , onExit: function (childId) {
          console.log('childId = ' + childId)
          pOnExit.fire(function(p) {
            return [childId];
          })
          // delay this to give any sends a chance to finish
          setTimeout(function () {
            var doQueue = false
            if (this.children[childId] && this.children[childId].activeCalls) {
              this.children[childId].calls.reverse().forEach(function (call) {
                if (call) {
                  this.callQueue.unshift(call)
                  doQueue = true
                }
              }.bind(this))
            }
            this.stopChild(childId)
            doQueue && this.processQueue()
          }.bind(this), 10)
        }

        // start a new worker
      , startChild: function () {
          this.children[++this.childId] = {
              send        : fork(this.path, this.receive.bind(this), this.onExit.bind(this, this.childId))
            , calls       : []
            , activeCalls : 0
          }
          var self = this
          pStartChild.fire(function(p) {
              return [self.childId]
          })
          this.activeChildren++
        }

        // stop a worker, identified by id
      , stopChild: function (child) {
          pStopChild.fire(function(p) {
            return [child.pid]
          })
          if (this.children[child]) {
            this.children[child].send('die')
            ;delete this.children[child]
            this.activeChildren--
          }
        }

        // called from a child process, the data contains information needed to
        // look up the child and the original call so we can invoke the callback
      , receive: function (data) {
          var idx   = data.idx
            , child = data.child
            , args  = data.args

          if (this.children[child]) {
            if (this.children[child].calls[idx]) {
              this.children[child].calls[idx].callback.apply(null, args)
              ;delete this.children[child].calls[idx]
              this.children[child].activeCalls--
              if (this.options.maxCallsPerWorker != -1
                  && this.children[child].calls.length >= this.options.maxCallsPerWorker
                  && !Object.keys(this.children[child].calls).length) {
                // this child has finished its run, kill it
                this.stopChild(child)
              }
              // allow any outstanding calls to be processed
              this.processQueue()
            } else
              console.error(
                  'Worker Farm: Received message for unknown index for existing child. '
                + 'This should not happen!'
              )
          } else
            console.error(
                'Worker Farm: Received message for unknown child. '
              + 'This is likely as a result of premature child death, the operation will have been re-queued.'
            )
        }

        // send a call to a worker, identified by id
      , send: function (child, call) {
          this.children[child].calls.push(call)
          this.children[child].activeCalls++
          this.children[child].send({
              idx    : this.children[child].calls.length - 1
            , child  : child
            , method : call.method
            , args   : call.args
          })
        }

        // a list of active worker ids, in order, but the starting offset is
        // shifted each time this method is called, so we work our way through
        // all workers when handing out jobs
      , childKeys: function () {
          var cka = Object.keys(this.children)
            , cks
          if (this.searchStart >= cka.length - 1) this.searchStart = 0
          else this.searchStart++
          cks = cka.splice(0, this.searchStart)
          return cka.concat(cks)
        }

        // Calls are added to a queue, this processes the queue and is called
        // whenever there might be a chance to send more calls to the workers.
        // The various options all impact on when we're able to send calls,
        // they may need to be kept in a queue until a worker is ready.
      , processQueue: function () {
          var cka, i = 0

          if (!this.callQueue.length) {
            if (this.ending) this.end()
            return
          }

          if (this.activeChildren < this.options.maxConcurrentWorkers)
            this.startChild()

          for (cka = this.childKeys(); i < cka.length; i++) {
            if ((this.options.maxConcurrentCallsPerWorker == -1
                || this.children[cka[i]].activeCalls < this.options.maxConcurrentCallsPerWorker)
                && (this.options.maxCallsPerWorker == -1
                  || this.children[cka[i]].calls.length < this.options.maxCallsPerWorker)) {

              this.send(cka[i], this.callQueue.shift())
              if (!this.callQueue.length) {
                if (this.ending) this.end()
                return
              }
            } /*else {
              console.log(
                  this.options.maxConcurrentCallsPerWorker == -1
                , this.children[cka[i]].activeCalls < this.options.maxConcurrentCallsPerWorker
                , this.options.maxCallsPerWorker == -1
                , this.children[cka[i]].calls.length < this.options.maxCallsPerWorker)
            }*/
          }

          if (this.ending) this.end()
        }

        // add a new call to the call queue, then trigger a process of the queue
      , addCall: function (call) {
          if (this.ending) return this.end() // don't add anything new to the queue
          this.callQueue.push(call)
          this.processQueue()
        }

        // kills child workers when they're all done
      , end: function (callback) {
          var complete = true
          if (this.ending === false) return
          this.ending = callback || true
          Object.keys(this.children).forEach(function (child) {
            if (!this.children[child]) return
            if (!this.children[child].activeCalls)
              this.stopChild(child)
            else
              complete = false
          }.bind(this))

          if (complete && typeof this.ending == 'function') {
            this.ending = false
            this.ending()
          }
        }
    }

module.exports = Farm