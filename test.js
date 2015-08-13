import test from 'tape'
import fn from './index'
import _ from 'highland'
import sinon from 'sinon'
import 'babel/polyfill'

test('connection', (t) => {
  t.plan(2)
  let world = makeWorld()
  world.createClient()
  t.ok(world.connectedWithRightParameters())
  t.ok(world.didSetCorrectEncoding())
})

test('write', (t) => {
  t.plan(1)
  let world = makeWorld()
  let str = world.createClient()
  world.sendMessageToClient()
  world.wasMessageSent().then(t.ok)
})

test('read', (t) => {
  t.plan(2)
  let world = makeWorld()
  let client = world.createClient()



  _(client)
    .filter(x => 'hej' === x).head().map(() => true).each(t.ok)
  world.state.netClient.write('msg hej')
  setTimeout(function() {
    world.sentToNetClient(
      'consume ' +
      world.state.topic + ' ' +
      world.state.generatedUUID.replace(/\-/g,'') + ' ' +
      'smallest\n'
    ).then(t.ok)
  },10)


})

let makeWorld = () => {
  let world = {}

  let state = world.state = {
    port: 4444,
    host: '192.168.99.100',
    topic: 'mytopic',
    generatedUUID: '6c84fb90-12c4-11e1-840d-7b25c5ee775a',
    messageToSend: 'whut',
    deps: {
      net: {
        connect: sinon.stub()
      },
      uuid: sinon.stub()
    },
    netClient: _()
  }
  state.netClient.setEncoding = sinon.stub()


  world.createClient = () => {
    state.deps.net.connect
      .withArgs(state.port, state.host)
      .returns(state.netClient)
    state.deps.uuid.returns(state.generatedUUID)
    state.client = fn(state.deps, {
      host: state.host,
      port: state.port
    }, state.topic)
    return state.client
  }
  world.sendMessageToClient = () =>
    _([state.messageToSend]).pipe(state.client)

  world.wasMessageSent = () =>
    world.sentToNetClient(
      'send ' + state.topic + ' ' +
      state.generatedUUID.replace(/\-/g,'') +
      ' ' + state.messageToSend+'\n')

  world.sentToNetClient = (expected) =>
    new Promise(resolve => {
      let timeout = setTimeout(() => reject(), 200)
      state
        .netClient
        .filter(x => expected === x)
        .each(() => {
          clearTimeout(timeout)
          resolve(true)
        })
    })

  world.connectedWithRightParameters = () =>
    state.deps.net.connect.calledWith(state.port, state.host)

  world.didSetCorrectEncoding = () =>
    state.netClient.setEncoding.calledWith('utf8')


  return world
}
