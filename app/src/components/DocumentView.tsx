import React, { useEffect } from 'react'
import { SyncIndicator } from './SyncIndicator';
import { SYNC_STATE } from '../types';
import {Layer, Upwell} from 'api';
import catnames from 'cat-names'
import Documents from '../Documents'

let documents: Upwell = Documents()

export type DocumentProps = {
  id: string
}

type LayerState = {
  text: string,
  title: string
}

function DocumentView(props: {layer: Layer}) {
  const { layer } = props
  let [status, setStatus] = React.useState(SYNC_STATE.LOADING)
  let [state, setState] = React.useState<LayerState>({ text: layer.text, title: layer.title })
  let [layers, setLayers] = React.useState<Layer[]>([])

  useEffect(() => {
    documents.layers().then((layers: Layer[])=> {
      setLayers(layers)
    })
  }, [])

  let onDownloadClick = async () => {
    let filename = layer.title + '.up'
    let el = window.document.createElement('a')
    let buf: Uint8Array = layer.save()
    el.setAttribute('href', 'data:application/octet-stream;base64,' + buf.toString());
    el.setAttribute('download', filename)
    el.click()
  }

  let onCreateLayer = async () => {
    let message = 'Very cool layer'
    let author = catnames.random()
    let newLayer = Layer.create(message, layer, author)
    console.log('created layer', newLayer)
    await documents.persist(newLayer)
  }

  let onSyncClick = async () => {
    try {
      setStatus(SYNC_STATE.LOADING)
      await documents.syncWithServer(layer)
      setState({ title: layer.title, text: layer.text })
      setStatus(SYNC_STATE.SYNCED)
    } catch (err) {
      setStatus(SYNC_STATE.OFFLINE)
    }
  }

  function onTextChange(e: React.ChangeEvent<HTMLTextAreaElement>, key: string) {
    e.preventDefault()
    setStatus(SYNC_STATE.LOADING)
    // @ts-ignore
    switch (e.nativeEvent.inputType) {
      case 'insertText':
        //@ts-ignore
        doc.insertAt(e.target.selectionEnd - 1, e.nativeEvent.data)
        break;
      case 'deleteContentBackward':
        //@ts-ignore
        doc.deleteAt(e.target.selectionEnd)
        break;
      case 'insertLineBreak':
        //@ts-ignore
        doc.insertAt(e.target.selectionEnd - 1, '\n')
        break;
    }
    setState({ title: layer.title, text: layer.text })
    documents.persist(layer)
    setStatus(SYNC_STATE.SYNCED)
  }

  return (
    <div id="container">
      <div id="app">
        <div id="toolbar">
            <div id="toolbar.buttons">
              <button onClick={onDownloadClick}>Download</button>
              <button onClick={onSyncClick}>Sync</button>
              <button onClick={onCreateLayer}>+ Layer</button>
            </div>
          <div>
            <SyncIndicator state={status} />
          </div>
        </div>
        <textarea className="title" value={state.title} onChange={(e) => onTextChange(e, 'title')}></textarea>
        <textarea className="text" value={state.text} onChange={(e) => onTextChange(e, 'text')}></textarea>
      </div>
      <ul id="panel">
        {layers.map((layer: Layer)=> {
          return <RelatedDocument layer={layer} />
        })}
      </ul>
      <div id="debug">
        id: {layer.id}
        <br></br>
        author: {layer.author}
        <br></br>
        message: {layer.message}
      </div>
    </div>
  )
}

export default function MaybeDocumentView({
  id
}: DocumentProps) {
  let [layer, setState] = React.useState<Layer | null>(null)

  useEffect(() => {
    // FIXME: what if the id isn't a real one (and just junk?) 
    // Make sure to handle errors gracefully (either redirect to list or just make a new document)
    documents.getLocal(id).then((layer: Layer | null) => {
      if (layer) setState(layer)
    }).catch((err: Error) => {
      console.error('got error', err)
    })
  }, [id])

  if (layer) return <DocumentView layer={layer} />
  else return <div>Loading...</div>

}


function RelatedDocument(props: { layer: Layer}) {
  let meta = props.layer
  let href = "/doc/" + meta.id
  console.log('related', meta)

  return <li key={meta.id}>
    <a href={href}> {meta.message} by {meta.author}</a>
  </li>

}