import test from 'tape'
import subject from './index'
import _ from 'highland'
import sinon from 'sinon'
import liar from './liar'
import merge from 'mout/object/merge'


// TODO
// * try for real
// * coerce errors
// * prevent writing pre-ready
// * maybe: break out liar

test('connection', (t) => {
  t.plan(2)
  let act = makeAct()
  act.begin()
  t.ok(act.connectedWithRightParameters())
  t.ok(act.didSetCorrectEncoding())
})

test('write', (t) => {
  t.plan(2)
  let act = makeAct()
  let str = act.beginNoRead()
  act.sendMessageToClient()
  act.assertMessageSent(t.pass)
  act.mocks.serverConnection.assertNotReceived(/consume/, t.pass)
})

test('read (replay)', (t) => {
  t.plan(2)
  let act = makeAct({
    command: 'replay',
    expectedOffset: 'smallest'
  })
  act.begin()
  act.mocks.serverConnection.push('msg hej')
  act.output.assertReceived('hej', t.pass())
  act.assertReceivedCorrectConsume(t.pass)
})


test('read (play)', (t) => {
  t.plan(2)
  let act = makeAct({
    command: 'play',
    expectedOffset: 'largest'
  })
  act.begin()
  act.mocks.serverConnection.push('msg hej')
  act.output.assertReceived('hej', t.pass())
  act.assertReceivedCorrectConsume(t.pass)
})

test('read (play, multiple)', (t) => {
  t.plan(2)
  let act = makeAct({
    command: 'play',
    expectedOffset: 'largest'
  })
  act.begin()
  act.mocks.serverConnection.push('msg hej1')
  act.mocks.serverConnection.push('msg hej2')
  act.output.assertReceived('hej1', t.pass())
  act.output.assertReceived('hej2', t.pass())
})

test('ack', (t) => {
  t.plan(1)
  let act = makeAct()
  let api = act.begin()
  api.ack()
  act.mocks.serverConnection.assertReceived('ack\n', t.pass)
})

let makeAct = (constructorScene) => {

  let act = {}

  act.scene = merge({
    port: 4444,
    host: '192.168.99.100',
    topic: 'mytopic',
    generatedUUID: '6c84fb90-12c4-11e1-840d-7b25c5ee775a',
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

  act.beginNoRead = () => {
    act.mocks.net.connect
      .withArgs(act.scene.port, act.scene.host)
      .returns(act.mocks.serverConnection)

    act.mocks.uuid.returns(act.scene.generatedUUID)

    act.instance = subject({
      net: act.mocks.net,
      uuid: act.mocks.uuid
    }, {
      host: act.scene.host,
      port: act.scene.port
    }, act.scene.command, act.scene.topic)

    return act.instance
  }

  act.begin = () => {

    act.beginNoRead()

    act.instance.pipe(act.output)

    return act.instance
  }

  act.sendMessageToClient = () =>
    _([act.scene.messageToSend]).pipe(act.instance)

  act.assertMessageSent = (done) =>
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
