import SimplePeer from 'simple-peer'

const p = new SimplePeer({
  initiator: window.location.hash === '#1',
  trickle: false
})

p.on('error', err => console.log('error', err))

p.on('signal', data => {
  console.log(Buffer.from(JSON.stringify(data)).toString('base64'))
})

let params = new URLSearchParams(window.location.search)
let query = params.get('query')
if (query) {
  let signal = JSON.parse(Buffer.from(query, 'base64').toString())
  p.signal(signal)
}

p.on('connect', () => {
  console.log('CONNECT')
  p.send('whatever' + Math.random())
})

p.on('data', data => {
  console.log('data: ' + data)
})