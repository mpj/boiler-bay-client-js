import test from 'tape'
import fn from './index'
import _ from 'highland'
import sinon from 'sinon'

test('connection',  (t) => {
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
  t.ok(world.wasMessageSent())
})

let makeWorld = () => {
  let world = {}

  world.state = {
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
    netClient: {
      setEncoding: sinon.stub(),
      write: sinon.stub()
    }
  }

  world.createClient = () => {
    world.state.deps.net.connect
      .withArgs(world.state.port, world.state.host)
      .returns(world.state.netClient)
    world.state.deps.uuid.returns(world.state.generatedUUID)
    world.state.client = fn(world.state.deps, {
      host: world.state.host,
      port: world.state.port
    }, world.state.topic)
    return world.state.client
  }
  world.sendMessageToClient = () =>
    _([world.state.messageToSend]).pipe(world.state.client)
  world.wasMessageSent = () =>
    world.state.netClient.write.calledWith(
      'send ' + world.state.topic + ' '+
      world.state.generatedUUID.replace(/\-/g,'') +
      ' '+world.state.messageToSend+'\n')

  world.connectedWithRightParameters = () =>
    world.state.deps.net.connect.calledWith(world.state.port, world.state.host)
  world.didSetCorrectEncoding = () =>
    world.state.netClient.setEncoding.calledWith('utf8')


  return world
}
