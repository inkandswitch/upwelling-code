import React, { useEffect } from 'react'
import { SyncIndicator } from './SyncIndicator';
import { SYNC_STATE } from '../types';
import {Layer, Upwell} from 'api';
import catnames from 'cat-names'
import Documents from '../Documents'
import ListDocuments from './ListDocuments';

let upwell: Upwell = Documents()

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
    await upwell.persist(newLayer)
  }

  let onSyncClick = async () => {
    try {
      setStatus(SYNC_STATE.LOADING)
      await upwell.syncWithServer(layer)
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
        layer.insertAt(e.target.selectionEnd - 1, e.nativeEvent.data, key)
        break;
      case 'deleteContentBackward':
        layer.deleteAt(e.target.selectionEnd, key)
        break;
      case 'insertLineBreak':
        layer.insertAt(e.target.selectionEnd - 1, '\n', key)
        break;
    }
    setState({ title: layer.title, text: layer.text })
    upwell.persist(layer)
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
        <ListDocuments />
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
    upwell.getLocal(id).then((layer: Layer | null) => {
      console.log(layer)
      if (layer) setState(layer)
    }).catch((err: Error) => {
      console.error('got error', err)
    })
  }, [id])

  if (layer) return <DocumentView layer={layer} />
  else return <div>Loading...</div>

}

