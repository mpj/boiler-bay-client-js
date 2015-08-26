import test from 'tape'
import subject from './index'
import _ from 'highland'
import sinon from 'sinon'
import liar from './liar'
import merge from 'mout/object/merge'

// TODO
// * coerce errors
// * prevent writing pre-ready
// * dont' send consume command until connected
// * maybe: break out liar
// * test for concurrect connectionss
// * prevent writing non-json object (server?)



test('play (fromStart: true)', (t) => {
  t.plan(4)
  let act = makeAct()
  act.scene.playerOpts = { fromStart: true }
  act.makeMain()
  act.makePlayer()
  act.mocks.serverConnection.push('ready')
  act.mocks.serverConnection.push('consume-started')
  act.mocks.serverConnection.push('msg ' + JSON.stringify({hello: 'world'}))
  act.output.assertReceived({'hello': 'world'}, t.pass())
  act.assertReceivedCorrectConsume(t.pass)
  t.ok(act.connectedWithRightParameters())
  t.ok(act.didSetCorrectEncoding())
})

test('play (custom id)', (t) => {
  t.plan(4)
  let act = makeAct()
  act.scene.playerID = 'myid'
  act.makeMain()
  act.makePlayer()
  act.mocks.serverConnection.push('msg ' + JSON.stringify({hello: 'world'}))
  act.output.assertReceived({'hello': 'world'}, t.pass())
  act.assertReceivedCorrectConsume(t.pass)
  t.ok(act.connectedWithRightParameters())
  t.ok(act.didSetCorrectEncoding())
})



test('play (fromStart: false)', (t) => {
  t.plan(4)
  let act = makeAct()
  act.playerOpts = { fromStart: false }
  act.expectedOffset = 'largest'
  act.makeMain()
  act.makePlayer()
  act.mocks.serverConnection.push('msg ' + JSON.stringify({hello: 'world'}))
  act.output.assertReceived({'hello': 'world'}, t.pass())
  act.assertReceivedCorrectConsume(t.pass)
  t.ok(act.connectedWithRightParameters())
  t.ok(act.didSetCorrectEncoding())
})


test('play, multiple', (t) => {
  t.plan(4)
  let act = makeAct()
  act.playerOpts = { fromStart: false }
  act.expectedOffset = 'largest'
  act.makeMain()
  act.makePlayer()
  act.mocks.serverConnection.push('msg ' + JSON.stringify({hello: 'world'}))
  act.mocks.serverConnection.push('msg ' + JSON.stringify({hello: 'worlds'}))
  act.output.assertReceived({hello: 'world'}, t.pass())
  act.output.assertReceived({hello: 'worlds'}, t.pass())
  t.ok(act.connectedWithRightParameters())
  t.ok(act.didSetCorrectEncoding())
})

test('play, failure', (t) => {
  t.plan(2)
  let act = makeAct()
  act.makeMain()
  act.makePlayer()
  act.instances.player.on('error', (err) => {
    t.equal(err.message, 'messagehere')
    t.equal(err.code, 'codehere')
  })
  act.mocks.serverConnection.push('error codehere messagehere')
})

test('ack', (t) => {
  t.plan(3)
  let act = makeAct()
  act.makeMain()
  act.makePlayer()
  act.instances.player.ack()
  act.mocks.serverConnection.assertReceived('ack\n', t.pass)
  t.ok(act.connectedWithRightParameters())
  t.ok(act.didSetCorrectEncoding())
})

test('appender', (t) => {
  t.plan(3)
  let act = makeAct()
  act.makeMain()
  act.makeAppender()
  act.sendSceneMessageToClient()
  act.assertSceneMessageSent(t.pass)
  t.ok(act.connectedWithRightParameters())
  t.ok(act.didSetCorrectEncoding())
})

test('appender failure', (t) => {
  t.plan(2)
  let act = makeAct()
  act.makeMain()
  act.makeAppender()
  act.sendSceneMessageToClient()
  act.instances.appender.on('error', (err) => {
    t.equal(err.message, 'messagehere')
    t.equal(err.code, 'codehere')
  })
  act.mocks.serverConnection.push('error codehere messagehere')
})




let makeAct = (constructorScene) => {

  let act = {}

  act.scene = merge({
    port: 4444,
    host: '192.168.99.100',
    topic: 'mytopic',
    generatedUUID: '6c84fb90-12c4-11e1-840d-7b25c5ee775a',
    playerOpts: null,
    playerId: null,
    playerFromStart: null,
    messageToSend: { hello: 'world' },
    expectedOffset: 'smallest'
  }, constructorScene)

  act.mocks = {
    net: {
      connect: sinon.stub()
    },
    uuid: sinon.stub(),
    serverConnection: merge(liar(), {
      setEncoding: sinon.stub()
    })
  }

  act.output = liar()

  act.makeAppender = () =>
    act.instances.appender =
      act.instances.main.appender(act.scene.topic)

  act.makePlayer = () => {

    let opts
    if (act.scene.playerID) {
      opts = opts || {}
      opts.id = act.scene.playerID
    }
    if (act.scene.playerFromStart) {
      opts = opts || {}
      opts.fromStart = act.scene.playerFromStart
    }

    act.instances.player =
      act.instances.main.player(act.scene.topic, opts)
    act.instances.player.pipe(act.output)
  }

  act.makeMain = () => {
    act.mocks.net.connect
      .withArgs(act.scene.port, act.scene.host)
      .returns(act.mocks.serverConnection)

    act.mocks.uuid.returns(act.scene.generatedUUID)

    act.instances = {
      main: subject({
        net: act.mocks.net,
        uuid: act.mocks.uuid
      }, {
        host: act.scene.host,
        port: act.scene.port
      })
    }

  }


  act.sendSceneMessageToClient = () =>
    _([act.scene.messageToSend]).pipe(act.instances.appender)

  act.assertSceneMessageSent = (done) =>
    act.mocks.serverConnection.assertReceived(
      'send ' + act.scene.topic + ' ' +
      act.scene.generatedUUID.replace(/\-/g,'') +
      ' ' + JSON.stringify(act.scene.messageToSend)+'\n',
      done)

  act.assertReceivedCorrectConsume = (done) =>
    act.mocks.serverConnection.assertReceived(
      'consume ' +
      act.scene.topic + ' ' +
      (act.scene.playerID || act.scene.generatedUUID.replace(/\-/g,'')) +
      ' ' +
      act.scene.expectedOffset + '\n',
      done
    )

  act.connectedWithRightParameters = () =>
    act.mocks.net.connect.calledWith(act.scene.port, act.scene.host)

  act.didSetCorrectEncoding = () =>
    act.mocks.serverConnection.setEncoding.calledWith('utf8')


  return act
}
