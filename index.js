import _ from 'highland'
import duplex from './object-duplex'

export default (deps, opts, command, topic) => {
  let conn = deps.net.connect(opts.port, opts.host)
  conn.setEncoding('utf8')

  let consumeSent = false

  let api = duplex(
    (x, cb) => {
      conn.write(
        'send ' +
        topic + ' ' +
        deps.uuid().replace(/\-/g, '') + ' ' +
        x + '\n')
      cb()
    },
    (push) => {
      if(!consumeSent) {
        consumeSent = true
        _(conn).map(x => x.replace('msg ','')).each(x => push(x))
        conn.write(
          'consume ' + topic + ' ' +
          deps.uuid().replace(/\-/g,'') + ' ' +
          (command === 'replay' ? 'smallest' : 'largest') +
          '\n')
      }
    }
  )

  api.ack = () =>
    conn.write('ack\n')

  return api
}
