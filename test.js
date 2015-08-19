import test from 'tape'
import subject from './index'
import _ from 'highland'
import sinon from 'sinon'
import liar from './liar'
import merge from 'mout/object/merge'

let api = subject

// TODO
// * cosnumer group
// * coerce errors
// * prevent writing pre-ready
// * dont' send consume command until connected
// * maybe: break out liar
// * test for concurrect connectionss


test('connection (player)', (t) => {
  t.plan(2)
  let act = makeAct()
  act.makeMain()
  act.makePlayer()
  t.ok(act.connectedWithRightParameters())
  t.ok(act.didSetCorrectEncoding())
})

test('connection (appender)', (t) => {
  t.plan(2)
  let act = makeAct()
  act.makeMain()
  act.makeAppender()
  t.ok(act.connectedWithRightParameters())
  t.ok(act.didSetCorrectEncoding())
})

test('append', (t) => {
  t.plan(2)
  let act = makeAct()
  act.makeMain()
  act.makeAppender()
  act.sendSceneMessageToClient()
  act.assertSceneMessageSent(t.pass)
  act.mocks.serverConnection.assertNotReceived(/consume/, t.pass)
})


test('replay', (t) => {
  t.plan(2)
  let act = makeAct()
  act.scene.playerOpts = { fromStart: true }
  act.makeMain()
  act.makePlayer()
  act.mocks.serverConnection.push('msg hej')
  act.output.assertReceived('hej', t.pass())
  act.assertReceivedCorrectConsume(t.pass)
})



test('play', (t) => {
  t.plan(2)
  let act = makeAct()
  act.playerOpts = { fromStart: false }
  act.expectedOffset = 'largest'
  act.makeMain()
  act.makePlayer()
  act.mocks.serverConnection.push('msg hej')
  act.output.assertReceived('hej', t.pass())
  act.assertReceivedCorrectConsume(t.pass)
})


test('play, multiple', (t) => {
  t.plan(2)
  let act = makeAct()
  act.playerOpts = { fromStart: false }
  act.expectedOffset = 'largest'
  act.makeMain()
  act.makePlayer()
  act.mocks.serverConnection.push('msg hej1')
  act.mocks.serverConnection.push('msg hej2')
  act.output.assertReceived('hej1', t.pass())
  act.output.assertReceived('hej2', t.pass())
})

test('ack', (t) => {
  t.plan(1)
  let act = makeAct()
  act.makeMain()
  act.makePlayer()
  act.instances.player.ack()
  act.mocks.serverConnection.assertReceived('ack\n', t.pass)
})

let makeAct = (constructorScene) => {

  let act = {}

  act.scene = merge({
    port: 4444,
    host: '192.168.99.100',
    topic: 'mytopic',
    generatedUUID: '6c84fb90-12c4-11e1-840d-7b25c5ee775a',
    playerOpts: null,
    messageToSend: 'whut',
    command: 'replay',
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
    act.instances.player =
      act.instances.main.player(act.scene.topic, act.scene.playerOpts)
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
      ' ' + act.scene.messageToSend+'\n',
      done)

  act.assertReceivedCorrectConsume = (done) =>
    act.mocks.serverConnection.assertReceived(
      'consume ' +
      act.scene.topic + ' ' +
      act.scene.generatedUUID.replace(/\-/g,'') + ' ' +
      act.scene.expectedOffset + '\n',
      done
    )

  act.connectedWithRightParameters = () =>
    act.mocks.net.connect.calledWith(act.scene.port, act.scene.host)

  act.didSetCorrectEncoding = () =>
    act.mocks.serverConnection.setEncoding.calledWith('utf8')


  return act
}
