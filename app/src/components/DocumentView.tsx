import React, { useEffect } from 'react'
import { SyncIndicator } from './SyncIndicator';
import { SYNC_STATE } from '../types';
import Upwell , { Layer, LayerMetadata } from 'upwell';
import catnames from 'cat-names'

let documents = Upwell()

export type DocumentProps = {
  id: string
}

function DocumentView(props: {doc: Layer}) {
  const { doc } = props
  let [status, setStatus] = React.useState(SYNC_STATE.LOADING)
  let [state, setState] = React.useState<LayerMetadata>(doc.toJSON())
  let [layers, setLayers] = React.useState<Layer[]>([])

  useEffect(() => {
    documents.layers().then((layers: Layer[])=> {
      setLayers(layers)
    })
  }, [])

  let onDownloadClick = async () => {
    let filename = doc.title + '.up'
    let el = window.document.createElement('a')
    let buf = doc.toString()
    el.setAttribute('href', 'data:application/octet-stream;base64,' + buf);
    el.setAttribute('download', filename)
    el.click()
  }

  let onCreateVersion = async () => {
    let versionName = 'Very cool version '
    doc.commit(versionName, catnames.random())
    console.log('created version', doc.id, doc.message, doc.author)
    await documents.persist(doc)
  }

  let onSyncClick = async () => {
    try {
      setStatus(SYNC_STATE.LOADING)
      await documents.syncWithServer(doc)
      setState(doc.toJSON())
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
    setState(doc.toJSON())
    documents.persist(doc)
    setStatus(SYNC_STATE.SYNCED)
  }

  return (
    <div id="container">
      <div id="app">
        <div id="toolbar">
            <div id="toolbar.buttons">
              <button onClick={onDownloadClick}>Download</button>
              <button onClick={onSyncClick}>Sync</button>
              <button onClick={onCreateVersion}>Create Version</button>
            </div>
          <div>
            <SyncIndicator state={status} />
          </div>
        </div>
        <textarea className="title" value={state.title} onChange={(e) => onTextChange(e, 'title')}></textarea>
        <textarea className="text" value={state.text} onChange={(e) => onTextChange(e, 'text')}></textarea>
      </div>
      <ul id="panel">
        {relatedDocuments.map(meta => {
          return <RelatedDocument meta={meta} />
        })}
      </ul>
      <div id="debug">
        id: {doc.id}
        <br></br>
        version: {doc.version}
        <br></br>
        message: {doc.message}
      </div>
    </div>
  )
}

export default function MaybeDocumentView({
  id
}: DocumentProps) {
  let [doc, setState] = React.useState<Layer | null>(null)

  useEffect(() => {
    // FIXME: what if the id isn't a real one (and just junk?) 
    // Make sure to handle errors gracefully (either redirect to list or just make a new document)
    documents.get(id).then(doc => {
      setState(doc)
    }).catch(err => {
      console.error('got error', err)
    })
  }, [id])

  if (doc) return <DocumentView doc={doc} />
  else return <div>Loading...</div>

}


function RelatedDocument(props: { meta: LayerMetadata }) {
  let meta = props.meta
  let href = "/doc/" + meta.id
  console.log('related', meta)

  return <li key={meta.version}>
    <a href={href}> {meta.message} by {meta.author}</a>
  </li>

}