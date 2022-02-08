import React, {useEffect} from 'react'
import DocumentView from './components/DocumentView'
import ListDocuments from './components/ListDocuments'
import { Upwell, Layer } from 'api'
import { Route, useLocation } from "wouter";
import { showOpenFilePicker } from 'file-system-access';
import Documents from './Documents'

let upwell: Upwell = Documents()

async function open (): Promise<Uint8Array> {
  let [fileHandle] = await showOpenFilePicker()
  const file = await fileHandle.getFile()
  return new Uint8Array(await file.arrayBuffer())
}

export default function App() {

  let onOpenClick = async () => {
    let binary: Uint8Array = await open()
    // this is a hack for demos as of December 21, we probably want to do something
    // totally different
    let layer =  Layer.load(binary)
    await upwell.add(layer)
    window.location.href = '/layer/' + layer.id
  }

  useEffect(() => {
    async function fetchLayers() {
      let layers = await upwell.layers()
      if (layers.length === 0) upwell.initialize()
    }

    fetchLayers()
  }, [])

  return <div>
    <button onClick={onOpenClick}>Open</button>
    <Route path="/layer/:id">
      {(params) => <DocumentView id={params.id} />}
    </Route>
    <Route path="/" component={ListDocuments}>  </Route>
  </div>
}
