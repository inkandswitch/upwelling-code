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
    title: string,
    text: string,
    sync_state: SYNC_STATE
  }

  constructor(props: AppProps) {
    super(props)

    let saved = storage.getItem(props.id)
    
    let initialChange = Automerge.getLastLocalChange(Automerge.change(Automerge.init('0000'), { time: 0 }, (doc: AppState) => {
      doc.parent = props.id
      doc.id = props.id
      doc.title = new Automerge.Text('')
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
      sync_state: SYNC_STATE.SYNCED,
      title: this.document.title.toString(),
      text: this.document.text.toString()
    }
  }

  _sync(ours: Automerge.Doc<AppState>, theirs: Automerge.Doc<AppState>) {
    this.setState({ sync_state: SYNC_STATE.LOADING })
    let changes = Automerge.getAllChanges(theirs)
    let [newDoc, ] = Automerge.applyChanges(ours, changes)
    let document = newDoc
    this.document = document as AppState
    this.setState({ title: this.document.title.toString(), text: this.document.text.toString(), sync_state: SYNC_STATE.SYNCED })
    return document
  }

  updateState (changeFn: Automerge.ChangeFn<AppState>) {
    this.setState({ sync_state: SYNC_STATE.LOADING })
    this.document = Automerge.change<AppState>(this.document, changeFn)
    this.setState({
      title: this.document.title.toString(),
      text: this.document.text.toString()
    })
    this.persist()
  }

  persist () {
    storage.setItem(this.document.id, this.document)
  }

  async _open() {
    let [fileHandle] = await showOpenFilePicker()
    const file = await fileHandle.getFile()
    let binary = new Uint8Array(await file.arrayBuffer())
    return Automerge.load<AppState>(binary as Automerge.BinaryDocument)
  }

  _fork(document: Automerge.Doc<AppState>) {
    let duplicate = Automerge.change(document, (doc: AppState) => {
      doc.id =  nanoid()
    })
    console.log('saving', duplicate.id)
    storage.setItem(duplicate.id, duplicate)
    return duplicate
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
      // always make a fork 
      let fork = this._fork(await this._open())
      let parent = this.document.parent
      if (parent === fork.parent) {
        // merge this document
        this._sync(this.document, fork)
        this.setState({ sync_state: SYNC_STATE.PREVIEW })
        this.persist()
      } else {
        window.location.href = '/' + fork.id
      }
    }

    let onRejectChanges = () => {
      let saved = storage.getItem(this.props.id)
      let old = Automerge.load<AppState>(saved as Automerge.BinaryDocument)
      window.location.href = '/' + old.id
    }

    let onAcceptChanges = () => {
      window.location.href = '/' + this.document.id
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
      this._fork(this.document)
      window.location.href = '/' + this.document.id
    }

    let onTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>, key: string) => {
      e.preventDefault()
      this.updateState((doc: AppState) => {
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
    }

    return (
      <div className="window">
        <div id="toolbar">
            {this.state.sync_state === SYNC_STATE.PREVIEW ? 
            <div id="toolbar.buttons">
              <span>Previewing changes.</span>
                <button onClick={onRejectChanges}>Stop</button>
                <button onClick={onAcceptChanges}>Merge</button>
              </div>
                : 
                <div id="toolbar.buttons">
                  <button onClick={onDownloadClick}>Download</button>
                  <button onClick={onOpenClick}>Open</button>
                  <button onClick={onClearClick}>Delete</button>
                  <button onClick={onForkClick}>Copy</button>
                </div>
            }
          <div>
          <SyncIndicator state={this.state.sync_state} />
        </div>
      </div>
          <textarea className="title" value={this.state.title} onChange={(e) => onTextChange(e, 'title')}></textarea>
          <textarea className="text" value={this.state.text} onChange={(e) => onTextChange(e, 'text')}></textarea>
      </div>
    )
  }
}
