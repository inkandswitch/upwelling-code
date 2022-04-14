const fs = require('fs')
const path = require('path')
const cors = require('cors')
const bodyParser = require('body-parser')
const express = require('express')
const expressWs = require('express-ws')

let app = express()
expressWs(app)
app.use(cors())
app.use(require('skipper')())

app.post('/:id', (req, res) => {
  let id = req.params.id
  let filename = req.query.filename
  if (filename && filename !== 'undefined') {
    console.log('saving', filename)
    req.file(id).upload({
      dirname: path.dirname(filename),
      saveAs: path.basename(filename),
    })
  }
})

module.exports = app
