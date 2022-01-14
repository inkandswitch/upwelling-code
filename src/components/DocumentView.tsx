import * as React from 'react'
import { SyncIndicator } from './SyncIndicator';
import { SYNC_STATE } from '../types';
import { showOpenFilePicker } from 'file-system-access';
import Documents, { UpwellingDoc } from '../documents';

let documents = Documents()

export type DocumentProps = {
  doc: UpwellingDoc
}

async function open (): Promise<UpwellingDoc> {
  let [fileHandle] = await showOpenFilePicker()
  const file = await fileHandle.getFile()
  let binary = new Uint8Array(await file.arrayBuffer())
  return documents.add(binary)
}

export default function DocumentView({
  doc 
}: DocumentProps) {
  let [status, setStatus] = React.useState(SYNC_STATE.SYNCED)
  let [state, setState] = React.useState(doc.view())

  function onTextChange(e: React.ChangeEvent<HTMLTextAreaElement>, key: string) {
    e.preventDefault()
    setStatus(SYNC_STATE.LOADING)
    doc.change((doc) => {
      // @ts-ignore
      switch (e.nativeEvent.inputType) {
        case 'insertText':
          //@ts-ignore
          doc[key].insertAt(e.target.selectionEnd - 1, e.nativeEvent.data)
          break;
        case 'deleteContentBackward':
          //@ts-ignore
          doc[key].deleteAt(e.target.selectionEnd)
          break;
        case 'insertLineBreak':
          //@ts-ignore
          doc[key].insertAt(e.target.selectionEnd - 1, '\n')
          break;
      }
    })
    setState(doc.view())
    documents.save(doc)
    setStatus(SYNC_STATE.SYNCED)
  }

  let onOpenClick = async () => {
    let opened = await open()
    let parent = doc.doc.parent
    if (parent === opened.doc.parent) {
      // we know about this document already.
      // merge this document
      setStatus(SYNC_STATE.LOADING)
      doc.sync(opened)
      setState(doc.view())
      setStatus(SYNC_STATE.PREVIEW)
      documents.save(doc)
    } else {
      // we don't know about this document yet
      // always make a fork 
      let duplicate = opened.fork()
      documents.save(duplicate)
      window.location.href = '/' + duplicate.id
    }
  }

  let onDownloadClick = async () => {
    let filename = doc.title + '.up'
    let el = window.document.createElement('a')
    let buf = UpwellingDoc.serialize(doc)
    el.setAttribute('href', 'data:application/octet-stream;base64,' + buf);
    el.setAttribute('download', filename)
    el.click()
  }

  return (
    <div id="container">
      <div id="app">
        <div id="toolbar">
          {status === SYNC_STATE.PREVIEW ?
            <div id="toolbar.buttons">
              <span>Previewing changes.</span>
            </div>
            :
            <div id="toolbar.buttons">
              <button onClick={onDownloadClick}>Download</button>
              <button onClick={onOpenClick}>Open</button>
            </div>
          }
          <div>
            <SyncIndicator state={status} />
          </div>
        </div>
        <textarea className="title" value={state.title} onChange={(e) => onTextChange(e, 'title')}></textarea>
        <textarea className="text" value={state.text} onChange={(e) => onTextChange(e, 'text')}></textarea>
      </div>
    </div>
  )
}
