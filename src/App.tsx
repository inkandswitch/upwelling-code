import * as React from 'react'
import { BoxUtil, Shape } from './shapes'
import { TLShapeUtilsMap, Renderer, TLKeyboardEventHandler, TLKeyboardInfo, TLPageState } from '@tldraw/core'
import Vec from '@tldraw/vec'
import { nanoid } from 'nanoid';
import { TLPointerInfo } from '@tldraw/core';
import * as Automerge from 'automerge';
import * as storage from './storage/localStorage';
import * as http from './storage/http';
import { SyncIndicator } from './components/SyncIndicator';
import { AppState, AppProps, SYNC_STATE } from './types';
import { showOpenFilePicker, showSaveFilePicker } from 'file-system-access';

export const shapeUtils: TLShapeUtilsMap<Shape> = {
  box: new BoxUtil(),
}

export default class App extends React.Component<AppProps> {
  initialDocument: AppState
  document: AppState
  state: {
    message: string
    page: AppState,
    sync_state: SYNC_STATE,
    pageState: TLPageState,
  }

  constructor(props: AppProps) {
    super(props)

    let saved = storage.getItem(props.id)
    
    let initialChange = Automerge.getLastLocalChange(Automerge.change(Automerge.init('0000'), { time: 0 }, (doc: AppState) => {
      doc.id = props.id
      doc.shapes = {}
      doc.bindings = {}
    }))
    const [ initialDocument , ]= Automerge.applyChanges(Automerge.init<AppState>(), [initialChange])
    this.initialDocument = this.document = initialDocument 
    if (saved) {
      console.log('loading locally saved document and overriding initial document')
      this.document = Automerge.load(saved as Automerge.BinaryDocument)
      console.log(this.document)
    }

    this.state = {
      sync_state: SYNC_STATE.LOADING,
      message: 'idle',
      page: {
        id: this.props.id,
        shapes: this.document.shapes,
        bindings: this.document.bindings,
      },
      pageState: {
        id: this.props.id,
        selectedIds: [],
        hoveredId: undefined,
        camera: {
          point: [0, 0],
          zoom: 1,
        }
      } as TLPageState
    }
  }

  _sync(document: Automerge.Doc<AppState>) {
    this.setState({ sync_state: SYNC_STATE.LOADING })
    http.sync(this.props.id, document).then((document: Automerge.Doc<any>) => {
      this.document = document as AppState
      this.setState({ page: document, sync_state: SYNC_STATE.SYNCED })
      this.persist()
    }).catch(err => {
      console.error(err)
    })
  }

  updateState (changeFn: Automerge.ChangeFn<AppState>) {
    this.setState({ sync_state: SYNC_STATE.LOADING })
    this.document = Automerge.change<AppState>(this.document, changeFn)
    this.setState({
      page: this.document
    })
    this.persist()
  }

  saveToNetwork() {
    this.setState({ message: 'saving to network' })
    http.setItem(this.props.id, this.document).then(_ => {
      this.setState({ message: 'idle' })
    }).catch (err => {
      this.setState({ sync_state: SYNC_STATE.OFFLINE })
    })
  }

  persist () {
    storage.setItem(this.props.id, this.document)
  }

  render() {
    const onDoubleClickCanvas = (e: TLPointerInfo) => {
      let shape = {
        id: nanoid(),
        type: 'box',
        name: 'Box',
        parentId: this.props.id,
        isLocked: false,
        point: e.point,
        size: [100, 100],
        childIndex: Object.values(this.document.shapes).length
      } as Shape

      this.updateState((doc: AppState) => {
        doc.shapes[shape.id] = shape
      })
    }

    const onHoverShape = (e: TLPointerInfo) => {
      this.setState({message: 'on hover '})
      this.setState({
        pageState: {
          ...this.state.pageState,
          hoveredId: e.target
        }
      })
    }

    const onUnhoverShape = (e: TLPointerInfo) => {
      this.setState({message: 'idle'})
      this.setState({
        pageState: {
          ...this.state.pageState,
          hoveredId: undefined
        }
      })
    }

    const onPointShape = (e: TLPointerInfo) => {
      this.setState({message: 'point selected'})
      if (this.state.pageState.selectedIds.includes(e.target)) return
      else this.setState({
        pageState: {
          ...this.state.pageState,
          selectedIds: [e.target],
        }
      })
    }

    const onReleaseShape = (e: TLPointerInfo) => {
      this.setState({message: 'idle'})
      const shape = this.state.page.shapes[e.target]
      if (this.document.shapes[e.target] === shape) return
      this.updateState((doc: AppState) => {
        doc.shapes[e.target].point = shape.point
      })
    }

    const onDragShape = (e: TLPointerInfo) => {
      // TODO: this is creating a change and saving the automerge document to disk for every drag. 
      // instead, let's only save it every 500ms or something?
      this.setState({message: 'on drag'})
      const shape = this.state.page.shapes[e.target]
      if (shape.isLocked) return

      this.setState({
        page: {
          ...this.state.page,
          shapes: {
            ...this.state.page.shapes,
            [shape.id]: {
              ...shape,
              point: Vec.sub(e.point, Vec.div(shape.size, 2))
            }
          }
        }
      })
    }

    const onKeyDown: TLKeyboardEventHandler = (key: string, info: TLKeyboardInfo, e: KeyboardEvent) => {
      switch (key) {
        case 'l': {
          this.updateState((doc: AppState) => {
            this.state.pageState.selectedIds.forEach(id => {
              doc.shapes[id].isLocked = !doc.shapes[id].isLocked
            })
          })
        }
      }
    }

    const onShapeChange = (changes: any) => {
      console.log('on shape change', changes)
      const shape = this.state.page.shapes[changes.id]
      this.setState({
        page: {
          ...this.state.page,
          shapes: {
            ...this.state.page.shapes,
            [shape.id]: {
              ...shape,
              ...changes,
            } as Shape,
          },
        }
      })
    }

    const theme = {
      accent: 'rgb(255, 0, 0)',
      brushFill: 'rgba(0,0,0,.05)',
      brushStroke: 'rgba(0,0,0,.25)',
      selectStroke: 'rgb(66, 133, 244)',
      selectFill: 'rgba(65, 132, 244, 0.05)',
      background: 'rgb(248, 249, 250)',
      foreground: 'rgb(51, 51, 51)',
    }

    let events = {
      onHoverShape,
      onUnhoverShape,
      onKeyDown,
      onDoubleClickCanvas,
      onPointShape,
      onReleaseShape,
      onDragShape,
      onShapeChange
    }

    let onSyncClick = () => {
      this._sync(this.document)
    }

    let onClearClick = () => {
      http.deleteItem(this.props.id)
      localStorage.clear()
    }

    let onOpenClick = async () => {
      let [fileHandle] = await showOpenFilePicker()
      const file = await fileHandle.getFile()
      let binary = new Uint8Array(await file.arrayBuffer())
      this._sync(Automerge.load(binary as Automerge.BinaryDocument))
    }

    let onDownloadClick = async () => {
      let fileHandle = await showSaveFilePicker({
        suggestedName: this.props.id + '.sesh',
        types: [
          { accept: { "image/png": [ ".sesh" ] } },
        ]

      })
      let writer = await fileHandle.createWritable()
      let binary = Automerge.save(this.document)
      writer.write(binary)
      writer.close()
    }


    let meta = {}
  
    return (
      <div>
        <div className="tldraw">
          <Renderer
            shapeUtils={shapeUtils} // Required
            page={this.state.page} // Required
            pageState={this.state.pageState} // Required
            {...events}
            meta={meta}
            theme={theme}
            id={undefined}
            containerRef={undefined}
            hideBounds={true}
            hideIndicators={false}
            hideHandles={true}
            hideCloneHandles={true}
            hideBindingHandles={true}
            hideRotateHandles={true}
            userId={undefined}
            users={undefined}
            snapLines={undefined}
            onBoundsChange={undefined}
          />
        </div>
        <div id="toolbar">
          <div id="toolbar.buttons">
            <button onClick={onDownloadClick}>Download</button>
            <button onClick={onOpenClick}>Open</button>
            <button onClick={onSyncClick}>Sync</button>
            <button onClick={onClearClick}>Delete</button>
          </div>
          <SyncIndicator state={this.state.sync_state} />
            {this.state.message}
        </div>
      </div>
    )
  }
}
