import test from 'tape'
import fn from './index'
import _ from 'highland'
import sinon from 'sinon'

test('connection',  (t) => {
  t.plan(2)

  let world = makeWorld()

  world.run()

  t.ok(world.connectedWithRightParameters())
  t.ok(world.didSetCorrectEncoding())
})

test.only('write', (t) => {
  t.plan(1)

  let world = makeWorld()

  let str = world.run()

  _(['whut']).pipe(str)
  t.ok(
    world.state.client.write.calledWith('send mytopic 6c84fb9012c411e1840d7b25c5ee775a whut\n'))

})

let makeWorld = () => {
  let world = {}

  world.state = {
    port: 4444,
    host: '192.168.99.100',
    topic: 'mytopic',
    generatedUUID: '6c84fb90-12c4-11e1-840d-7b25c5ee775a',
    deps: {
      net: {
        connect: sinon.stub()
      },
      uuid: sinon.stub()
    },
    client: {
      setEncoding: sinon.stub(),
      write: sinon.stub()
    }
  }

  world.run = () => {
    world.state.deps.net.connect
      .withArgs(world.state.port, world.state.host)
      .returns(world.state.client)
    world.state.deps.uuid.returns(world.state.generatedUUID)
    return fn(world.state.deps, {
      host: world.state.host,
      port: world.state.port
    }, world.state.topic)
  }

  world.connectedWithRightParameters = () =>
    world.state.deps.net.connect.calledWith(world.state.port, world.state.host)
  world.didSetCorrectEncoding = () =>
    world.state.client.setEncoding.calledWith('utf8')

  return world
}
