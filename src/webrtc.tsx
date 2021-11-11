import React from 'react'
import SimplePeer from 'simple-peer'

export const Collaborators = (props: any) => {
  let [signal, setSignal] = React.useState<any>('')

  React.useEffect(() => {
    const p = new SimplePeer({
      initiator: window.location.hash === '#1',
      trickle: false
    })

    p.on('error', err => console.log('error', err))
    p.on('signal', data => {
      let signal = Buffer.from(JSON.stringify(data)).toString('base64')
      setSignal(signal)
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
  }, [])

  return (
    <div>
      <input type="text" value={signal}></input>
    </div>
  )
}