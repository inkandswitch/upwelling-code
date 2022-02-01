import React, { useEffect } from 'react'
import { SyncIndicator } from './SyncIndicator';
import { SYNC_STATE } from '../types';
import Documents, { UpwellingDoc } from '../backend';

let documents = Documents()

export type DocumentProps = {
  id: string
}

function DocumentView(props: {doc: UpwellingDoc}) {
  const { doc } = props
  let [status, setStatus] = React.useState(SYNC_STATE.LOADING)
  let [state, setState] = React.useState(doc.view())

  let onDownloadClick = async () => {
    let filename = doc.title + '.up'
    let el = window.document.createElement('a')
    let buf = doc.toString()
    el.setAttribute('href', 'data:application/octet-stream;base64,' + buf);
    el.setAttribute('download', filename)
    el.click()
  }

  let onSyncClick = async () => {
    try {
      setStatus(SYNC_STATE.LOADING)
      await documents.syncWithServer(doc)
      setState(doc.view())
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
    setState(doc.view())
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
            </div>
          <div>
            <SyncIndicator state={status} />
          </div>
        </div>
        <textarea className="title" value={state.title} onChange={(e) => onTextChange(e, 'title')}></textarea>
        <textarea className="text" value={state.text} onChange={(e) => onTextChange(e, 'text')}></textarea>
      </div>
      <div id="debug">
        root: {doc.root}
        <br></br>
        id: {doc.id}
        <br></br>
        message: {doc.message}
      </div>
    </div>
  )
}

export default function MaybeDocumentView({
  id
}: DocumentProps) {
  let [doc, setState] = React.useState<UpwellingDoc | null>(null)

  useEffect(() => {
    documents.get(id).then(doc => {
      if (doc) setState(doc)
      else {
        doc = UpwellingDoc.create(id)
      }
    }).catch(err => {
      console.error('got error', err)

    })
  }, [id])

  if (doc) return <DocumentView doc={doc} />
  else return <div>Loading...</div>

}
