import _ from 'highland'
import duplex from './object-duplex'
import merge from 'mout/object/merge'
import fi from './fi'
export default (deps, opts) => {

  let connect = () => {
    let connection = deps.net.connect(opts.port, opts.host)
    connection.setEncoding('utf8')
    return connection
  }

  let errorRegExp = /^error\s(\S+)\s(.+)/
  let isError = str => !!str.match(errorRegExp)
  let asErrorObject = str => {
    let m = str.match(errorRegExp)
    let message = m[2]
    let err = new Error(message)
    err.code = m[1]
    return err
  }


  let api = {
    player: (channel, opts) => {

      opts = merge({
        id: deps.uuid().replace(/\-/g,''),
        fromStart: true
      }, opts)

      let connection = connect()

      let output = _(connection)
        .fork()
        .filter(x => x.match(/^msg/))
        .map(x => x.replace('msg ',''))
        .map(JSON.parse)

      let errors = _()
      let messages = _()
      _(connection)
        .each(x =>
          fi(isError(x), () => errors.write(x), () => messages.write(x)))

      _(errors)
        .map(asErrorObject)
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
      let connection = connect()

      let buffer = _()
      let input = _()
      input
        .map(x =>
          'send ' +
          topic + ' ' +
          deps.uuid().replace(/\-/g, '') + ' ' +
          JSON.stringify(x) + '\n'
        ).pipe(buffer)

      let errors = _()
      let messages = _()
      _(connection)
        .each((x) => fi(
          x.match(/^error\s(\S+)\s(.+)/),
          () => errors.write(x),
          () => messages.write(x)))

      _(messages)
        .filter(x => x === 'ready')
        .head()
        .each(() => buffer.pipe(connection))

      _(errors)
        .map(asErrorObject)
        .each(x => input.emit('error', x))

      return input
    },


  }

  return api

}
