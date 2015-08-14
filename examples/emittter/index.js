var workerFarm = require('../../')
  , workers    = workerFarm(require.resolve('./child'))
  , ret        = 0

for (var i = 0; i < 10; i++) {
  var worker = workers('#' + i + ' FOO', function (err, outp) {
    console.log(outp)
    if (++ret == 10)
      workerFarm.end(workers)
  })

  worker.on("worker.*", function (txt, i) {
    console.log(this.event,txt, i);
  })
  worker.emit("farm.foo", "foo", i);
}