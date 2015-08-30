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

  let forkBy = (strm, evaluator) => {
    let left = _(), right = _()
    _(strm).each(x => evaluator(x) ? left.write(x) : right.write(x))
    return [left, right]
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

      let [ errors, nonErrors ] = forkBy(connection, isError)

      _(errors)
        .map(asErrorObject)
        .each(x => output.emit('error', x))

      let [ readys, nonReadys ] = forkBy(nonErrors, x => x === 'ready')

      _(readys).pull(() => connection.write(
        'consume ' + channel + ' ' +
        opts.id + ' ' +
        (opts.fromStart ? 'smallest' : 'largest') +
        '\n'))

      let output = _(nonReadys)
        .filter(x => x.match(/^msg/))
        .map(x => x.replace('msg ',''))
        .map(JSON.parse)



      output.ack = () => connection.write('ack\n')
      return output

    },
    appender: (topic) => {
      let connection = connect()

      let input = _()
      let transformedInput = input
        .map(x =>
          'send ' +
          topic + ' ' +
          deps.uuid().replace(/\-/g, '') + ' ' +
          JSON.stringify(x) + '\n'
        )

      let [ errors, others ] = forkBy(connection, isError)

      _(others)
        .filter(x => x === 'ready')
        .head()
        .pull(() => transformedInput.pipe(connection))

      _(errors)
        .map(asErrorObject)
        .each(x => input.emit('error', x))

      return input
    },


  }

  return api

}
