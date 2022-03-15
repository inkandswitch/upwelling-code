import React from 'react'
import { Route, useLocation } from 'wouter'
import Documents from './Documents'
import DraftView from './components/DraftView'
import DraftList from './components/DraftTable'
import withDocument from './components/withDocument'
import { nanoid } from 'nanoid'
require('setimmediate')

let documents = Documents()

export default function App() {
  let [, setLocation] = useLocation()

  async function newUpwell() {
    let id = nanoid()
    let doc = await documents.create(id, documents.author)
    setLocation('/document/' + doc.id + '/draft/latest')
  }


  return (
    <>
      {/* <div id="topbar">
      My name is {author}
    </div> */}
      <Route path="/document/:id/drafts">
        {(params) => {
          let props = {
            author: documents.author,
            ...params,
          }
          let Component = withDocument(DraftList, props)
          return <Component />
        }}
      </Route>

      <Route path="/document/:id/draft/:did">
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
            <div>
              <button onClick={newUpwell}>New Document</button>
            </div>
          )
        }}
      </Route>
    </>
  )
}
