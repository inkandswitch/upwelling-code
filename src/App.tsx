import * as React from 'react'
import { nanoid } from 'nanoid';
import * as Automerge from 'automerge';
import * as storage from './storage/localStorage';
import { Map } from './components/Map';
//@ts-ignore
import { Feature, Document, AppState, AppProps, SYNC_STATE } from './types';
import { showOpenFilePicker } from 'file-system-access';

export default class App extends React.Component<AppProps> {
  document: AppState
  state: {
    features: Feature[],
    sync_state: SYNC_STATE,
    documents: Document[]
  }

  constructor(props: AppProps) {
    super(props)

    let saved = storage.getDoc(props.id)
    
    let initialChange = Automerge.getLastLocalChange(Automerge.change(Automerge.init('0000'), { time: 0 }, (doc: AppState) => {
      doc.parent = props.id
      doc.id = props.id
      doc.features = []
    }))
    const [ initialDocument , ]= Automerge.applyChanges(Automerge.init<AppState>(), [initialChange])
    this.document = initialDocument 
    if (saved) {
      console.log('loading locally saved document and overriding initial document')
      this.document = Automerge.load(saved as Automerge.BinaryDocument)
    }

    this.state = {
      sync_state: SYNC_STATE.SYNCED,
      features: this.document.features,
      documents: this._listDocuments()
    }
  }

  _listDocuments() {
    return storage.list().reduce((acc: any, cur: Document) => {
      if (!cur) return acc
      if (!acc.length) return [cur]
      if (acc[0]?.meta?.parent === cur.meta.parent) return acc
      return acc.concat(cur)
    }, [])
  }

  _sync(ours: Automerge.Doc<AppState>, theirs: Automerge.Doc<AppState>) {
    if (theirs.id !== ours.id) throw new Error('document ids dont match')
    let changes = Automerge.getAllChanges(theirs)
    let [newDoc, ] = Automerge.applyChanges(ours, changes)
    let document = newDoc
    this.document = document as AppState
    this.setState({
      sync_state: SYNC_STATE.SYNCED,
      features: this.document.features
    })
    return document
  }

  updateState (changeFn: Automerge.ChangeFn<AppState>) {
    this.document = Automerge.change<AppState>(this.document, changeFn)
    console.log('updating state') 
    this.setState({
      features: this.document.features,
      list: this._listDocuments()
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
    let onOpenClick = async () => {
      // always make a fork 
      let opened = await this._open()
      // merge this document
      this._sync(this.document, opened)
      this.setState({ sync_state: SYNC_STATE.SYNCED })
      this.persist()
    }

    let onDownloadClick = async () => {
      let filename = this.document.id + '.sesh'
      let el = document.createElement('a')
      let buf = Automerge.save(this.document)
      el.setAttribute('href', 'data:application/octet-stream;base64,' + Buffer.from(buf).toString('base64'));
      el.setAttribute('download', filename)
      el.click()
    }

    let onNewClick = () => {
      window.location.href = '/' 
    }

    let onClearClick = () => {
      storage.deleteItem(this.document.id)
      window.location.href = '/'
    }

    let onChangeText = (id: string, e: Event) => {
      this.updateState((doc: AppState) => {
        //@ts-ignore
        let indx = doc.features.findIndex(f => f.id === id)
        //@ts-ignore
        switch (e.inputType) {
          case 'insertText':
            //@ts-ignore
            doc.features[indx].description.insertAt(e.target.selectionEnd - 1, e.data)
            break;
          case 'deleteContentBackward':
            //@ts-ignore
            doc.features[indx].description.deleteAt(e.target.selectionEnd)
            break;
          case 'insertLineBreak':
            //@ts-ignore
            doc.features[indx].description.insertAt(e.target.selectionEnd - 1, '\n')
            break;
        }
        console.log(doc.features[indx].description?.toString())
      })
    }

    let onMapChange = (feature: Feature) => {
      console.log('adding feature', feature)
      this.updateState((doc: AppState) => {
        doc.features.push({
          id: feature.id,
          lat: feature.lat,
          lng: feature.lng,
          description: new Automerge.Text()
        })
      })
    }
    /*

            <ul>
              {Automerge.getHistory(this.document).map((state: Automerge.State<AppState>) => {
                return <li>
                  {state.change.actor.slice(0, 4)}: {neatime(state.change.time)}, features: {state.snapshot.features.length}
                </li>
              }).reverse()}
            </ul>
            */

    return (
      <div id="container">
        <div id="app">
          <div id="toolbar">
            <div id="toolbar.buttons">
              <button onClick={onClearClick}>Clear</button>
              <button onClick={onDownloadClick}>Download</button>
              <button onClick={onOpenClick}>Open</button>
              <button onClick={onNewClick}>New</button>
            </div>
          </div>
        </div>
        <Map features={this.state.features}
          onChangeText={onChangeText}
          onMapChange={onMapChange}></Map>
      </div>
      )
    }
  }
