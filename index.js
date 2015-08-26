import _ from 'highland'
import duplex from './object-duplex'
import merge from 'mout/object/merge'

export default (deps, opts) => {

  let connect = () => {
    let connection = deps.net.connect(opts.port, opts.host)
    connection.setEncoding('utf8')
    return connection
  }

  let connection = null

  let stringsToErrors = () => _.pipeline(
    _.invoke('match', [/^error\s(\S+)\s(.+)/]),
    _.compact(),
    _.map(x => {
      let message = x[2]
      let err = new Error(message)
      err.code = x[1]
      return err
    })
  )

  let api = {
    player: (channel, opts) => {

      opts = merge({
        id: deps.uuid().replace(/\-/g,''),
        fromStart: true
      }, opts)

      connection = connect()

      let output = _(connection)
        .fork()
        .filter(x => x.match(/^msg/))
        .map(x => x.replace('msg ',''))
        .map(JSON.parse)

      _(connection)
        .fork()
        .through(stringsToErrors())
        .each(x => output.emit('error', x))

      connection.write(
        'consume ' + channel + ' ' +
        opts.id + ' ' +
        (opts.fromStart ? 'smallest' : 'largest') +
        '\n')

      output.ack = () => connection.write('ack\n')
      return output

    },
    appender: (topic) => {
      connection = connect()
      let input = _()
      input
        .map(x =>
          'send ' +
          topic + ' ' +
          deps.uuid().replace(/\-/g, '') + ' ' +
          JSON.stringify(x) + '\n'
        ).pipe(connection)

      _(connection)
        .through(stringsToErrors())
        .each(x => input.emit('error', x))

      return input
    },


  }

  return api

}
