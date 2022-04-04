import React from 'react'
import { Redirect, Route } from 'wouter'
import Documents from './Documents'
import DraftView from './components/DraftView'
import withDocument from './components/withDocument'
import NoDocument from './components/NoDocument'
require('setimmediate')

let documents = Documents()

export default function App() {
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
          return <NoDocument />
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
