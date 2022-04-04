const express = require('express')
const expressWs = require('express-ws')
const { Documents } = require('api')
const { nanoid } = require('nanoid')

const SUBSCRIPTION_PEER = process.env.STORAGE_URL || 'http://localhost:5001'

let documents = new Documents(
  {
    name: 'Server',
    id: nanoid(),
  },
  SUBSCRIPTION_PEER
)

app.ws('/:id/connect', async (req, res) => {
  try {
    upwell = documents.get(id)
    documents.connect(id)
    documents.connectDraft(id, req.params.did)
  } catch (err) {
    console.error(err)
    console.error('No document found')
    res.end()
  }
})

app.ws('/:id/:did/destroy', async (req, res) => {
  documents.disconnect(req.params.id)
  documents.disconnect(req.params.did)
  console.error('Disconnected')
  res.end()
})
