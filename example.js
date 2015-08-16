import index from './index'
import uuid from 'uuid'
import net from 'net'
import partial from 'mout/function/partial'
import _ from 'highland'

let api = partial(index, { uuid, net })

let cmd = partial(api, {
  host: '192.168.99.100',
  port: 4444
})

let replay = partial(cmd, 'replay')
let str = replay('mytopic')

_(str).each((x) => {

  if(x.indexOf('ready') > -1 || x.indexOf('consume-started') > -1) return;
  console.log("woowowoowow",x)
  str.ack()
})
