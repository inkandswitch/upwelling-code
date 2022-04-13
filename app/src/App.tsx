import React from 'react'
import { Redirect, Route } from 'wouter'
import Documents from './Documents'
import DraftView from './components/DraftView'
import withDocument from './components/withDocument'
import NoDocument from './components/NoDocument'
import { useLocation } from 'wouter'
import { Button } from './components/Button'
import { nanoid } from 'nanoid'

let documents = Documents()

require('setimmediate')

export default function App() {
  let [, setLocation] = useLocation()
  async function newUpwell() {
    let id = nanoid()
    let doc = await documents.create(id, documents.author)
    setLocation('/' + doc.id + '/stack')
  }

  async function openUpwell() {
    let binary = null
  }

  async function onBinary(binary: Buffer) {
    let upwell = await documents.toUpwell(binary)
    await documents.storage.setItem(upwell.id, binary)
    setLocation('/' + upwell.id + '/stack')
  }
  return (
    <>
      <Route path="/:id/:did">
        {(params) => {
          let props = {
            author: documents.author,
            ...params,
          }

          let Component = withDocument(DraftView, props)
          return <Component />
        }}
      </Route>
      <Route path="/">
        {() => {
          return (
            <NoDocument>
              <Button onClick={newUpwell}>New Document</Button>
            </NoDocument>
          )
        }}
      </Route>

      <Route path="/:id">
        <Redirect to="/" />
      </Route>
      <Route>
        <Redirect to="/" />
      </Route>
    </>
  )
}
