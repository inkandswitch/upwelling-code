import React, {useEffect, useState } from 'react'
import DocumentView from './components/DocumentView'
import { Upwell } from 'api'
import { Route, useLocation } from "wouter";
import Documents from './Documents'
import catnames from 'cat-names';

let upwell: Upwell = Documents()


export default function App() {
  let [location, setLocation] = useLocation()
  let [author, setAuthor] = useState<string>('')

  async function newUpwell() {
    await upwell.initialize(author)
    let meta = await (upwell.metadata())
    setLocation('/document/' + meta.main)
  }
  useEffect(() => {
    let localName = localStorage.getItem('name')
    if (!localName || localName === '?') localName = catnames.random()
    if (localName && author !== localName) {
      localStorage.setItem('name', localName)
    }
    setAuthor(localName)
  }, [author])

  return <div>
    <div id="topbar">
      My name is {author}
    </div>
    <Route path="/document/:id">
      {(params) => <DocumentView author={author} id={params.id} />}
    </Route>
    <Route path="/">{() => {
      return <div><button onClick={newUpwell}>New Document</button></div>
    }}
    </Route>
  </div>
}
