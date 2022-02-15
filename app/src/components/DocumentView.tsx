import React, { useEffect } from 'react'
import { SyncIndicator } from './SyncIndicator';
import { SYNC_STATE } from '../types';
import {Author, Layer, Upwell} from 'api';
import Documents from '../Documents'
import ListDocuments from './ListDocuments';

let upwell: Upwell = Documents()

type DocumentProps = {
  id: string,
  author: Author
}

type DocumentViewProps = {
  layer: Layer,
  author: Author
}

type LayerState = {
  text: string,
  title: string
}

async function open (): Promise<Uint8Array> {
  let [fileHandle] = await showOpenFilePicker()
  const file = await fileHandle.getFile()
  return new Uint8Array(await file.arrayBuffer())
}

function DocumentView(props: DocumentViewProps) {
  const { author, layer } = props
  let [status, setStatus] = React.useState(SYNC_STATE.LOADING)
  let [state, setState] = React.useState<LayerState>({ text: layer.text, title: layer.title })
  let [layers, setLayers] = React.useState<Layer[]>([])
  useEffect(() => {
    upwell.layers().then((layers: Layer[]) => {
      setLayers(layers)
    })
  }, [])


  let onOpenClick = async () => {
    let binary: Uint8Array = await open()
    // this is a hack for demos as of December 21, we probably want to do something
    // totally different
    let layer =  Layer.load(binary)
    await upwell.add(layer)
    window.location.href = '/layer/' + layer.id
  }

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
    let newLayer = Layer.fork(message, author, layer)
    await upwell.add(newLayer)
    setLayers(await upwell.layers())
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

  let mergeVisible = () => {
    let visible = layers.filter(l => l.visible)

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
          <div>
            <SyncIndicator state={status} />
          </div>
        </div>
        <textarea className="title" value={state.title} onChange={(e) => onTextChange(e, 'title')}></textarea>
        <textarea className="text" value={state.text} onChange={(e) => onTextChange(e, 'text')}></textarea>
      
      </div>
      <ul id="panel">
        <button onClick={onCreateLayer}>+ Layer</button>
        <ListDocuments layers={layers}/>
        <button onClick={mergeVisible}>Merge Visible</button>
      </ul>
    </div>
  )
}

export default function MaybeDocumentView({
  author, id
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

  if (layer) return <DocumentView author={author} layer={layer} />
  else return <div>Loading...</div>

}

