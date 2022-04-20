const express = require('express')
const path = require('path')
const cors = require('cors')
const bodyParser = require('body-parser')
const expressWs = require('express-ws')
const automerge = require('automerge-wasm-pack')
const { nanoid } = require('nanoid')
const { createAuthorId } = require('api')

let app = express()
expressWs(app)
app.use(cors())

const SERVER_PEER_ID = 'CLOUD_PEER'

let peers = {}
let documents = {}

app.ws('/:docId/connect/:peerId', function (ws, req) {
  let id = req.params.docId
  let peerId = req.params.peerId
  let peerList = peers[id]
  if (!peerList) {
    peers[id] = {}
    let doc = automerge.create()
    let serverPeer = new RTC(id, doc, {
      id: createAuthorId(),
      name: SERVER_PEER_ID,
    })
    documents[id] = serverPeer
    serverPeer.connect(ws)
  }

  let peer = peerList[peerId]
  if (!peer) peerList[peerId] = ws

  ws.on('message', function (msg) {
    let peerList = peers[id]
    let value = JSON.parse(msg)
    if (value.method === 'BYE') {
      try {
        delete peerList[value.peerId]
      } catch (e) {
        console.log("HMMM COULDN'T ACCESS peerList", e)
      }
      return
    }
    let incomingPeer = value.peerId
    if (!peerList) {
      console.error('sad, no peerList?')
      return
    }

    for (let peerId of Object.keys(peerList)) {
      // dont echo back to themselves
      if (peerId !== incomingPeer) {
        console.log('sending to', incomingPeer)
        let ws = peerList[peerId]
        if (ws) {
          ws.send(msg)
        }
      }
    }
  })

  ws.on('error', (err) => {
    console.log('closing socket', req.params.peerId)
    delete peerList[req.params.peerId]
  })

  ws.on('close', () => {
    console.log('closing socket', req.params.peerId)
    delete peerList[req.params.peerId]
  })
})

module.exports = app

class RTC {
  constructor(id, doc, author) {
    this.id = id
    this.doc = doc
    this.author = author
    this.peerStates = new Map()
  }

  _getPeerState(peerId) {
    let state = this.peerStates.get(peerId)
    if (!state) {
      // This should never happen, we missed an OPEN
      // but it isn't a fatal error, just re-create it
      state = automerge.initSyncState()
      this.peerStates.set(peerId, state)
    }
    return state
  }

  receiveSyncMessage(ws, msg) {
    let state = this._getPeerState(msg.peerId)
    if (!msg.message) {
      console.error('msg', msg)
      throw new Error('Malformed syncMessage')
    }
    let syncMessage = Uint8Array.from(Buffer.from(msg.message, 'base64'))
    this.doc.receiveSyncMessage(state, syncMessage)
    this.sendSyncMessage(ws, msg.peerId)
  }

  updatePeers() {
    let peers = this.peerStates.keys()

    for (let peerId of peers) {
      this.sendSyncMessage(peerId)
    }
  }

  sendSyncMessage(ws, peerId) {
    let state = this._getPeerState(peerId)
    let syncMessage = this.doc.generateSyncMessage(state)
    if (!syncMessage) return // done
    let msg = {
      peerId: this.peerId,
      author: this.author,
      method: 'MESSAGE',
      message: Buffer.from(syncMessage).toString('base64'),
    }
    console.log('sending syncMessage')
    this.send(ws, msg)
  }

  send(ws, msg) {
    try {
      ws.send(JSON.stringify(msg))
    } catch (err) {}
  }

  sendOpen(ws) {
    console.log('Opened', this.id)
    this.send(ws, {
      author: this.author,
      peerId: this.peerId,
      method: 'OPEN',
    })
  }

  connect(ws) {
    ws.on('open', () => {
      this.sendOpen(ws)
    })
    ws.on('message', (msg) => {
      let value = JSON.parse(msg)
      switch (value.method) {
        case 'OPEN':
          this.sendSyncMessage(ws, value.peerId)
          break
        case 'MESSAGE':
          this.receiveSyncMessage(ws, value)
          break
        case 'BYE':
          console.log('BYE')
          break
        default:
      }
    })
    return ws
  }
}
