import test from 'tape'
import subject from './index'
import _ from 'highland'
import sinon from 'sinon'
import liar from './liar'
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
  world.assertMessageSent(t.pass)
})

test('read (replay)', (t) => {
  t.plan(2)
  let world = makeWorld()
  let out = liar()
  world.createClient().pipe(out)
  world.state.netClient.push('msg hej')
  out.assertReceived('hej', t.pass())
  world.state.netClient.assertReceived(
    'consume ' +
    world.state.topic + ' ' +
    world.state.generatedUUID.replace(/\-/g,'') + ' ' +
    'smallest\n',
    t.pass
  )
})

let makeWorld = () => {
  let world = {}

  let state = world.state = {
    port: 4444,
    host: '192.168.99.100',
    topic: 'mytopic',
    generatedUUID: '6c84fb90-12c4-11e1-840d-7b25c5ee775a',
    messageToSend: 'whut',
    command: 'replay',
    deps: {
      net: {
        connect: sinon.stub()
      },
      uuid: sinon.stub()
    },
    netClient: liar()
  }
  state.netClient.setEncoding = sinon.stub()

  world.createClient = () => {
    state.deps.net.connect
      .withArgs(state.port, state.host)
      .returns(state.netClient)
    state.deps.uuid.returns(state.generatedUUID)
    state.client = subject(state.deps, {
      host: state.host,
      port: state.port
    }, state.command, state.topic)
    return state.client
  }
  world.sendMessageToClient = () =>
    _([state.messageToSend]).pipe(state.client)

  world.assertMessageSent = (done) =>
    state.netClient.assertReceived(
      'send ' + state.topic + ' ' +
      state.generatedUUID.replace(/\-/g,'') +
      ' ' + state.messageToSend+'\n',
      done)

  world.connectedWithRightParameters = () =>
    state.deps.net.connect.calledWith(state.port, state.host)

  world.didSetCorrectEncoding = () =>
    state.netClient.setEncoding.calledWith('utf8')


  return world
}
