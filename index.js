import _ from 'highland'
import stream from 'stream'
import util from 'util'
import merge from 'mout/object/merge'

let Duplex = stream.Duplex

export default (deps, opts, topic) => {
  let client = deps.net.connect(opts.port, opts.host)
  client.setEncoding('utf8')

  function MyDuplex(opts) {
    Duplex.call(this, merge({objectMode: true}, opts))
  }

  util.inherits(MyDuplex, Duplex);

  MyDuplex.prototype._read = function() {
    let self = this
    client.write(
      'consume ' + topic + ' ' +
      deps.uuid().replace(/\-/g,'') + ' ' +
      'smallest\n')

    _(client).pull(function (err, x) {
      self.push(x.replace('msg ',''))
    })
  }

  MyDuplex.prototype._write = function (x, enc, cb) {
    client.write(
      'send ' +
      topic + ' ' +
      deps.uuid().replace(/\-/g, '') + ' ' +
      x + '\n')
    cb()
  }

  return new MyDuplex()
}
