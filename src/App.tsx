import * as React from 'react'
import { nanoid } from 'nanoid';
import * as Automerge from 'automerge';
import * as storage from './storage/localStorage';
import * as http from './storage/http';
import { SyncIndicator } from './components/SyncIndicator';
import { AppState, AppProps, SYNC_STATE } from './types';
import { showOpenFilePicker } from 'file-system-access';

export default class App extends React.Component<AppProps> {
  document: AppState
  state: {
    message: string
    text: string,
    sync_state: SYNC_STATE
  }

  constructor(props: AppProps) {
    super(props)

    let saved = storage.getItem(props.id)
    
    let initialChange = Automerge.getLastLocalChange(Automerge.change(Automerge.init('0000'), { time: 0 }, (doc: AppState) => {
      doc.id = props.id
      doc.text = new Automerge.Text('')
    }))
    const [ initialDocument , ]= Automerge.applyChanges(Automerge.init<AppState>(), [initialChange])
    this.document = initialDocument 
    if (saved) {
      console.log('loading locally saved document and overriding initial document')
      this.document = Automerge.load(saved as Automerge.BinaryDocument)
      console.log(this.document)
    }

    this.state = {
      sync_state: SYNC_STATE.LOADING,
      message: 'idle',
      text: this.document.text.toString()
    }
  }

  _sync(ours: Automerge.Doc<AppState>, theirs: Automerge.Doc<AppState>) {
    this.setState({ sync_state: SYNC_STATE.LOADING })
    let changes = Automerge.getAllChanges(theirs)
    let [newDoc, ] = Automerge.applyChanges(ours, changes)
    let document = newDoc
    this.document = document as AppState
    this.setState({ text: this.document.text, sync_state: SYNC_STATE.SYNCED })
    if (this.props.id !== document.id) {
      this.setState({ message: 'previewing ' + document.id })
    }
    this.persist()
    return document
  }

  updateState (changeFn: Automerge.ChangeFn<AppState>) {
    this.setState({ sync_state: SYNC_STATE.LOADING })
    this.document = Automerge.change<AppState>(this.document, changeFn)
    this.setState({
      text: this.document.text.toString()
    })
    this.persist()
  }

  saveToNetwork() {
    this.setState({ message: 'saving to network' })
    http.setItem(this.document.id, this.document).then(_ => {
      this.setState({ message: 'idle' })
    }).catch (err => {
      this.setState({ sync_state: SYNC_STATE.OFFLINE })
    })
  }

  persist () {
    storage.setItem(this.document.id, this.document)
  }

  render() {
    let onClearClick = async () => {
      try { 
        await http.deleteItem(this.document.id)
      } catch (err) {
        console.error(err)
      }
      localStorage.clear()
      window.location.href = '/'
    }

    let onOpenClick = async () => {
      let [fileHandle] = await showOpenFilePicker()
      const file = await fileHandle.getFile()
      let binary = new Uint8Array(await file.arrayBuffer())
      let theirs = Automerge.load<AppState>(binary as Automerge.BinaryDocument)

      if (this.document.id.startsWith(theirs.id.split('_')[0])) this._sync(this.document, theirs)
      else {
        storage.setItem(theirs.id, theirs)
        window.location.href = '/' + theirs.id
      }
    }

    let onDownloadClick = async () => {
      let filename = this.document.id + '.sesh'
      let el = document.createElement('a')
      let buf = Automerge.save(this.document)
      el.setAttribute('href', 'data:application/octet-stream;base64,' + Buffer.from(buf).toString('base64'));
      el.setAttribute('download', filename)
      el.click()
    }

    let onForkClick = async () => {
      let duplicate = Automerge.change(this.document, (doc: AppState) => {
        doc.id = doc.id + '_' + nanoid()
      })
      storage.setItem(duplicate.id, duplicate)
      this.saveToNetwork()
      window.location.href = '/' + duplicate.id
    }

    let onMergeClick = async () => {
      let original = this.document.id.split("_")
      let newDoc = Automerge.change(this.document, (doc: AppState) => {
        doc.id = original[0]
      })
      this.document = newDoc
      this.setState({ text: this.document.text, sync_state: SYNC_STATE.SYNCED })
      this.persist()
      this.saveToNetwork()
      window.location.href = '/' + original[0]
    }

    let onTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      e.preventDefault()
      this.updateState((doc: AppState) => {
        // @ts-ignore
        switch (e.nativeEvent.inputType) {
          case 'insertText':
            //@ts-ignore
            doc.text.insertAt(e.target.selectionEnd - 1, e.nativeEvent.data)
            break;
          case 'deleteContentBackward':
            //@ts-ignore
            doc.text.deleteAt(e.target.selectionEnd)
            break;
          case 'insertLineBreak':
            //@ts-ignore
            doc.text.insertAt(e.target.selectionEnd - 1, '\n')
            break;
        }
      })
    }

    return (
      <div>
        <div className="tldraw">
          <textarea value={this.state.text} onChange={onTextChange}></textarea>
        </div>
        <div id="toolbar">
          <div id="toolbar.buttons">
            <button onClick={onDownloadClick}>Download</button>
            <button onClick={onOpenClick}>Open</button>
            <button onClick={onClearClick}>Delete</button>
            </div>

<div>
            Experimental: 
            <button onClick={onForkClick}>Duplicate</button>
            <button onClick={onMergeClick}>Merge</button>
          </div>
          <SyncIndicator state={this.state.sync_state} />
            {this.state.message}
        </div>
      </div>
    )
  }
}
