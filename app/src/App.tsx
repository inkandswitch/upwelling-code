import React, {useEffect, useState } from 'react'
import DocumentView from './components/DocumentView'
import { Upwell } from 'api'
import { Route, Redirect } from "wouter";
import Documents from './Documents'
import catnames from 'cat-names';

let upwell: Upwell = Documents()


export default function App() {
  let [author, setAuthor] = useState<string>('')
  let [ main_id, setMain] = useState<string | null>(null)

  useEffect(() => {
    let localName = localStorage.getItem('name')
    if (!localName || localName === '?') localName = catnames.random()
    if (localName && author !== localName) {
      localStorage.setItem('name', localName)
    }
    setAuthor(localName)
  }, [author])

  useEffect(() => {
    async function fetchLayers() {
      let layers = await upwell.layers()
      if (layers.length === 0) await upwell.initialize(author)
      setMain((await upwell.metadata()).main)
    }

    fetchLayers()
  })

  return <div>
    <div id="topbar">
      My name is {author}
    </div>
    <Route path="/layer/:id">
      {(params) => <DocumentView author={author} id={params.id} />}
    </Route>
    <Route path="/">{() => {
      if (main_id) return <Redirect to={'layer/' + main_id} />
      else return <div>Loading...</div>
    }}
    </Route>
  </div>
}
