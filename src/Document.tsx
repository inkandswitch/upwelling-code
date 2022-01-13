import * as React from 'react'
import * as Automerge from 'automerge';
import * as storage from './storage/localStorage';
import { SyncIndicator } from './components/SyncIndicator';
import { SYNC_STATE } from './types';
import { showOpenFilePicker } from 'file-system-access';
import { ForkableDocument } from './ForkableDocument';

export type DocumentProps = {
  doc: ForkableDocument
}

async function open (): Promise<ForkableDocument> {
  let [fileHandle] = await showOpenFilePicker()
  const file = await fileHandle.getFile()
  let binary = new Uint8Array(await file.arrayBuffer())
  return ForkableDocument.load(binary)
}

export default function Document({
  doc 
}: DocumentProps) {
  let [status, setStatus] = React.useState(SYNC_STATE.SYNCED)
  let [state, setState] = React.useState({
    title: doc.doc.title.toString(),
    text: doc.doc.text.toString(),
    list: storage.list()
  })

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
    setState({
      title: doc.doc.title.toString(),
      text: doc.doc.text.toString(),
      list: storage.list()
    })
    storage.setDoc(doc.id, doc.doc)
  }


  let onOpenClick = async () => {
    let opened = await open()
    let parent = doc.doc.parent
    if (parent === opened.doc.parent) {
      // we know about this document already.
      // merge this document
      setStatus(SYNC_STATE.LOADING)
      doc.sync(opened)

      setState({
        title: doc.doc.title.toString(),
        text: doc.doc.text.toString(),
        list: storage.list()
      })

      setStatus(SYNC_STATE.PREVIEW)
      storage.setDoc(doc.id, doc.doc)
    } else {
      // we don't know about this document yet
      // always make a fork 
      let duplicate = opened.fork()
      storage.setDoc(duplicate.id, duplicate.doc)
      window.location.href = '/' + duplicate.id
    }
  }

  let onForkClick = async () => {
    let fork = doc.fork()
    window.location.href = '/' + fork.id
  }

  let onDownloadClick = async () => {
    let filename = doc.id + '.sesh'
    let el = window.document.createElement('a')
    let buf = Automerge.save(doc.doc)
    el.setAttribute('href', 'data:application/octet-stream;base64,' + Buffer.from(buf).toString('base64'));
    el.setAttribute('download', filename)
    el.click()
  }

  return (
    <div id="container">
      <div>
        <h1>Documents</h1>
        <ul id="list">
          {state.list.map((item: any) => {
            return <li key={item.id}><a className='button' href={`/${item.id}`}>
              {item.meta.title}#{item.id.slice(0, 4)} {doc.id === item.id && "(selected)"}
            </a></li>
          })}
        </ul>
      </div>
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
              <button onClick={onForkClick}>Copy</button>
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
