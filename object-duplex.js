import util from 'util'
import stream from 'stream'
import merge from 'mout/object/merge'

// Wraps the ugly classical OOP API in functional goodness
export default (read, write) => {
  return new SomeDuplex(read, write)
}

function SomeDuplex(write, read, opts) {
  this.__read = read
  this.__write = write
  stream.Duplex.call(this, merge({ objectMode: true }, opts))
}

util.inherits(SomeDuplex, stream.Duplex);

SomeDuplex.prototype._read = function() {
  let push = x => this.push(x)
  this.__read(push)
}

SomeDuplex.prototype._write = function (x, enc, cb) {
  this.__write(x, cb)
}
