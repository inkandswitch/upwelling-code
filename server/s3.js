const express = require('express')
const path = require('path')
const cors = require('cors')
const bodyParser = require('body-parser')
const { GetObjectCommand, S3Client } = require('@aws-sdk/client-s3')
const fs = require('fs')
const expressWs = require('express-ws')

let accessKeyId = 'ZRJT7RHB37KDQC72YYAT'
let secretAccessKey = process.env.SPACES_SECRET
let endpoint = 'https://sfo3.digitaloceanspaces.com'
let region = 'sfo3'
const s3Client = new S3Client({
  endpoint,
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
})

const BUCKET = 'upwelling-semi-reliable-storage'
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

app.get('/:id', (req, res) => {
  let id = req.params.id

  // Specifies a path within your Space and the file to download.
  const bucketParams = {
    Bucket: BUCKET,
    Key: id,
  }
  s3Client
    .send(new GetObjectCommand(bucketParams))
    .then(async (response) => {
      const data = await streamToString(response.Body)
      res.send(data)
      console.log('sending')
    })
    .catch((err) => {
      console.error(err)
      res.status(404).send('Not found')
    })
})

app.post('/:id', (req, res) => {
  let id = req.params.id

  console.log('uploading', id)

  req.file(id).upload({
    dirname: path.join(__dirname, 'data'),
  })
  req.file(id).upload(
    {
      adapter: require('skipper-s3'),
      key: accessKeyId,
      secret: secretAccessKey,
      bucket: BUCKET,
      region,
      saveAs: id,
      endpoint,
    },
    (err, uploadedFiles) => {
      if (err) {
        return res.status(500).send(err.message)
      }

      return res.json({
        message: uploadedFiles.length + ' file(s) uploaded successfully!',
        files: uploadedFiles,
      })
    }
  )
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
        delete doc[value.peerId]
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
