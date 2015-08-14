module.exports = function (inp, callback) {
  var that = this;
  this.on("farm.*", function (txt, i) {
    console.log(this.event, txt, i);
    that.emit("worker.bar", "bar", i);
  })
  setTimeout(callback, 100, null, inp + ' BAR (' + process.pid + ')')
}