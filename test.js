import test from 'tape'
import subject from './index'
import _ from 'highland'
import sinon from 'sinon'
import liar from './liar'
import 'babel/polyfill'

test('connection', (t) => {
  t.plan(2)
  let act = makeAct()
  act.createClient()
  t.ok(act.connectedWithRightParameters())
  t.ok(act.didSetCorrectEncoding())
})

test('write', (t) => {
  t.plan(1)
  let act = makeAct()
  let str = act.createClient()
  act.sendMessageToClient()
  act.assertMessageSent(t.pass)
})

test('read (replay)', (t) => {
  t.plan(2)
  let act = makeAct()
  act.createClient()
  act.state.netClient.push('msg hej')
  act.state.output.assertReceived('hej', t.pass())
  act.state.netClient.assertReceived(
    'consume ' +
    act.state.topic + ' ' +
    act.state.generatedUUID.replace(/\-/g,'') + ' ' +
    'smallest\n',
    t.pass
  )
})


test('read (play)', (t) => {
  t.plan(2)
  let act = makeAct()
  act.state.command = 'play'
  act.createClient()
  act.state.netClient.push('msg hej')
  act.state.output.assertReceived('hej', t.pass())
  act.state.netClient.assertReceived(
    'consume ' +
    act.state.topic + ' ' +
    act.state.generatedUUID.replace(/\-/g,'') + ' ' +
    'largest\n',
    t.pass
  )
})

let makeAct = (opts) => {
  let act = {}

  let state = act.state = {
    port: 4444,
    host: '192.168.99.100',
    topic: 'mytopic',
    generatedUUID: '6c84fb90-12c4-11e1-840d-7b25c5ee775a',
    messageToSend: 'whut',
    command: 'replay',
    output: liar(),
    deps: {
      net: {
        connect: sinon.stub()
      },
      uuid: sinon.stub()
    },
    netClient: liar()
  }
  state.netClient.setEncoding = sinon.stub()

  act.createClient = () => {
    state.deps.net.connect
      .withArgs(state.port, state.host)
      .returns(state.netClient)
    state.deps.uuid.returns(state.generatedUUID)
    state.client = subject(state.deps, {
      host: state.host,
      port: state.port
    }, state.command, state.topic)
    state.client.pipe(state.output)
    return state.client
  }
  act.sendMessageToClient = () =>
    _([state.messageToSend]).pipe(state.client)

  act.assertMessageSent = (done) =>
    state.netClient.assertReceived(
      'send ' + state.topic + ' ' +
      state.generatedUUID.replace(/\-/g,'') +
      ' ' + state.messageToSend+'\n',
      done)

  act.connectedWithRightParameters = () =>
    state.deps.net.connect.calledWith(state.port, state.host)

  act.didSetCorrectEncoding = () =>
    state.netClient.setEncoding.calledWith('utf8')


  return act
}
