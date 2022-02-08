import React, {useEffect} from 'react'
import DocumentView from './components/DocumentView'
import ListDocuments from './components/ListDocuments'
import { Upwell, Layer } from 'api'
import { Route, useLocation } from "wouter";
import { showOpenFilePicker } from 'file-system-access';
import Documents from './Documents'

let upwell: Upwell = Documents()


export default function App() {


  useEffect(() => {
    async function fetchLayers() {
      let layers = await upwell.layers()
      if (layers.length === 0) upwell.initialize()
    }

    fetchLayers()
  }, [])

  return <div>
    <Route path="/layer/:id">
      {(params) => <DocumentView id={params.id} />}
    </Route>
    <Route path="/" component={ListDocuments}>  </Route>
  </div>
}
