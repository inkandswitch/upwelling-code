import * as React from 'react'
import { nanoid } from 'nanoid';
import * as storage from './storage/localStorage';
import * as http from './storage/http';
import { SyncIndicator } from './components/SyncIndicator';
import { ListItem, AppState, AppProps, SYNC_STATE } from './types';
import { showOpenFilePicker } from 'file-system-access';
import ProseEditor from './peritext';
import Micromerge from './peritext/micromerge';

export default class App extends React.Component<AppProps> {
  document: Micromerge
  state: {
    title: string,
    text: string,
    sync_state: SYNC_STATE,
    list: ListItem[]
  }

  constructor(props: AppProps) {
    super(props)

    let saved = localStorage.getItem(props.id)
    this.document = new Micromerge(props.id)
    if (saved) {
      console.log('loading locally saved document and overriding initial document')
      this.document = Micromerge.load(saved)
    }

    this.state = {
      sync_state: SYNC_STATE.SYNCED,
      list: this._list()
    }
  }

  _list() {
    return storage.list().reduce((acc: any, cur: ListItem) => {
      if (!acc.length) return [cur]
      if (acc[0]?.meta?.parent === cur.meta.parent) return acc
      return acc.concat(cur)
    }, [])
  }

  async _open() {
    let [fileHandle] = await showOpenFilePicker()
    const file = await fileHandle.getFile()
    let binary = await file.text()
    return Micromerge.load(binary)
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

    let onChange = (doc: Micromerge) => {
      let buf = doc.save()
    }

    return (
      <div id="container">
        <div>
          <h1>Documents</h1>
        <ul id="list">
          {this.state.list.map((item:any) => {
            let className = `button ${this.document.id === item.id && "selected"}`
            return <li key={item.id}><a className={className} href={`/${item.id}`}>
              {item.meta.title} 
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
            <ProseEditor onChange={onChange} />
        </div>
      </div>
      )
    }
  }
