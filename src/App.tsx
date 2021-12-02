import * as React from 'react'
import { nanoid } from 'nanoid';
import * as Automerge from 'automerge';
import * as storage from './storage/localStorage';
import * as http from './storage/http';
import { Map } from './components/Map';
import { SyncIndicator } from './components/SyncIndicator';
import { ListItem, AppState, AppProps, SYNC_STATE } from './types';
import { showOpenFilePicker } from 'file-system-access';

export default class App extends React.Component<AppProps> {
  document: AppState
  state: {
    title: string,
    text: string,
    sync_state: SYNC_STATE,
    list: ListItem[]
  }

  constructor(props: AppProps) {
    super(props)

    let saved = storage.getDoc(props.id)
    
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
    }

    this.state = {
      sync_state: SYNC_STATE.SYNCED,
      title: this.document.title.toString(),
      text: this.document.text.toString(),
      list: this._list()
    }
  }

  _list() {
    return storage.list().reduce((acc: any, cur: ListItem) => {
      console.log(cur)
      if (!cur) return acc
      if (!acc.length) return [cur]
      if (acc[0]?.meta?.parent === cur.meta.parent) return acc
      return acc.concat(cur)
    }, [])
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
      text: this.document.text.toString(),
      list: this._list()
    })
    this.persist()
  }

  persist () {
    storage.setDoc(this.document.id, this.document)
  }

  async _open() {
    let [fileHandle] = await showOpenFilePicker()
    const file = await fileHandle.getFile()
    let binary = new Uint8Array(await file.arrayBuffer())
    return Automerge.load<AppState>(binary as Automerge.BinaryDocument)
  }

  _fork(document: Automerge.Doc<AppState>) {
    let duplicate = Automerge.change(document, (doc: AppState) => {
      doc.id =  'sesh:' + nanoid()
    })
    console.log('saving', duplicate.id)
    storage.setDoc(duplicate.id, duplicate)
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
      let opened = await this._open()
      let parent = this.document.parent
      if (parent === opened.parent) {
        // merge this document
        this._sync(this.document, opened)
        this.setState({ sync_state: SYNC_STATE.PREVIEW })
        this.persist()
      } else {
        this._fork(opened)
        window.location.href = '/' + opened.id
      }
    }

    let onRejectChanges = () => {
      let saved = storage.getDoc(this.props.id)
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

    let onNewClick = () => {
      window.location.href = '/' 
    }

    let onMapChange = () => {

    }

    return (
      <div id="container">
        <div>
          <h1>Documents</h1>
          <button onClick={onClearClick}>Delete All Documents</button>
        <ul id="list">
          {this.state.list.map((item:any) => {
            return <li key={item.id}><a className='button' href={`/${item.id}`}>
              {item.meta.title}#{item.id.slice(0, 4)} {this.document.id === item.id && "(selected)"}
            </a></li>
          })}
        </ul>
        </div>
        <div id="app">
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
                    <button onClick={onForkClick}>Copy</button>
                    <button onClick={onNewClick}>New</button>
                  </div>
              }
            <div>
            <SyncIndicator state={this.state.sync_state} />
          </div>
        </div>
            <Map onChange={onMapChange}></Map>
        </div>
      </div>
      )
    }
  }
