import React, { Component, useEffect, useState } from 'react'
import DocumentView from './components/DocumentView'
import { Route, useLocation } from 'wouter'
import Documents from './Documents'
import catnames from 'cat-names'
import DraftView from './components/DraftView'
import DraftList from './components/DraftList'
import withDocument from './components/withDocument'
require('setimmediate')

let documents = Documents()

export default function App() {
  let [author, setAuthor] = useState<string>('')
  let [, setLocation] = useLocation()

  useEffect(() => {
    let localName = localStorage.getItem('name')
    if (!localName || localName === '?') localName = catnames.random()
    if (localName && author !== localName) {
      localStorage.setItem('name', localName)
    }
    setAuthor(localName)
  }, [author])

  async function newUpwell() {
    let doc = await documents.create()
    setLocation('/document/' + doc.id + '/drafts')
  }

  return (
    <>
      {/* <div id="topbar">
      My name is {author}
    </div> */}
      <Route path="/document/:id">
        {(params) => {
          let props = {
            author,
            ...params,
          }
          let Component = withDocument(DocumentView, props)
          return <Component />
        }}
      </Route>

      <Route path="/document/:id/drafts">
        {(params) => {
          let props = {
            author,
            ...params,
          }
          let Component = withDocument(DraftList, props)
          return <Component />
        }}
      </Route>

      <Route path="/document/:id/draft/:did">
        {(params) => {
          let props = {
            author,
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
