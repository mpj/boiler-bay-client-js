import index from './index'
import uuid from 'uuid'
import net from 'net'
import partial from 'mout/function/partial'
import _ from 'highland'

let api = partial(index, { uuid, net })

let bus = api({
  host: '192.168.99.100',
  port: 4444
})

let out = bus.player('xxs', { fromStart: true })

var start = Number(new Date())
var processed = 0
let perSecond;

_(out).each((x) => {
  out.ack()
  console.log("received", x)
  processed++
  let now = Number(new Date())
  let elapsed = now - start
  let perMessage = elapsed / processed
  perSecond = 1000 / perMessage
})


setInterval(() => console.log("per sec", perSecond), 1000)

let inp = bus.appender('xxs')
setInterval(() => inp.write({ lol: 'tut' + Math.random() }), 100)
