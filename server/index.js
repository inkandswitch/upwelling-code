const express = require('express')
const path = require('path')
const cors = require('cors')
const bodyParser = require('body-parser')
const fs = require('fs')
const expressWs = require('express-ws')

let app = express()
expressWs(app)
app.use(cors())
app.use(require('skipper')())

try {
  fs.mkdirSync(path.join(__dirname, 'data'))
} catch (err) {
  if (err.code !== 'EEXIST') {
    console.error(err)
  }
}

// Function to turn the file's body into a string.
const streamToString = (stream) => {
  const chunks = []
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    stream.on('error', (err) => reject(err))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
  })
}

app.get('/:id', async (req, res) => {
  let filename = path.join(__dirname, 'data', `${req.params.id}.upwell`)
  try {
    console.log('get ', req.params.id)
    const data = fs.createReadStream(filename)
    res.send(await streamToString(data))
  } catch (err) {
    console.error(err)
    res.status(404).send('Not found')
  }
})

app.post('/:id', (req, res) => {
  let id = req.params.id
  console.log('post', id)
  req.file(id).upload({
    dirname: path.join(__dirname, 'data'),
    saveAs: `${req.params.id}.upwell`,
  })
})

let documents = {}

app.ws('/:did/connect/:peerId', function (ws, req) {
  let doc = documents[req.params.did]
  if (!doc) {
    doc = {}
    documents[req.params.did] = doc
  }

  let peer = doc[req.params.peerId]
  if (!peer) doc[req.params.peerId] = ws
  console.log('opening', req.params.peerId)

  ws.on('message', function (msg) {
    let value = JSON.parse(msg)
    if (value.method === 'BYE') {
      console.log('closing socket', req.params.peerId)
      try {
        if (doc[value.peerId]) delete doc[value.peerId]
      } catch (e) {
        console.log("HMMM COULDN'T ACCESS DOC", e)
      }
      return
    }
    let incomingPeer = value.peerId
    let doc = documents[req.params.did]
    if (!doc) {
      console.error('sad, no doc?')
      return
    }

    for (let peerId of Object.keys(doc)) {
      // dont echo back to themselves
      if (peerId !== incomingPeer) {
        let ws = doc[peerId]
        if (ws) {
          ws.send(msg)
        }
      }
    }
  })

  ws.on('error', (err) => {
    console.log('closing socket', req.params.peerId)
    delete doc[req.params.peerId]
  })

  ws.on('close', () => {
    console.log('closing socket', req.params.peerId)
    delete doc[req.params.peerId]
  })
})

module.exports = app
