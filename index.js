import _ from 'highland'
import duplex from './object-duplex'

export default (deps, opts, command, topic) => {
  let conn = deps.net.connect(opts.port, opts.host)
  conn.setEncoding('utf8')

  return duplex(
    (x, cb) => {
      conn.write(
        'send ' +
        topic + ' ' +
        deps.uuid().replace(/\-/g, '') + ' ' +
        x + '\n')
      cb()
    },
    (push) => {
      conn.write(
        'consume ' + topic + ' ' +
        deps.uuid().replace(/\-/g,'') + ' ' +
        'smallest\n')

      _(conn).pull(function (err, x) {
        push(x.replace('msg ',''))
      })
    }
  )
}
