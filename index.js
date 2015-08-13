import _ from 'highland'


import merge from 'mout/object/merge'

import duplex from './object-duplex'

export default (deps, opts, topic) => {
  let client = deps.net.connect(opts.port, opts.host)
  client.setEncoding('utf8')

  return duplex(
    (x, cb) => {
      client.write(
        'send ' +
        topic + ' ' +
        deps.uuid().replace(/\-/g, '') + ' ' +
        x + '\n')
      cb()
    },
    (push) => {
      client.write(
        'consume ' + topic + ' ' +
        deps.uuid().replace(/\-/g,'') + ' ' +
        'smallest\n')

      _(client).pull(function (err, x) {
        push(x.replace('msg ',''))
      })
    }
  )
}
