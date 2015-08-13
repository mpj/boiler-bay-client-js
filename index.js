import _ from 'highland'

export default (deps, opts, topic) => {
  let client = deps.net.connect(opts.port, opts.host)
  client.setEncoding('utf8')
  let input = _()
  input.each(x => {
    client.write(
      'send ' +
      topic + ' ' +
      deps.uuid().replace(/\-/g, '') + ' ' +
      x + '\n')
  })
  return input
}
