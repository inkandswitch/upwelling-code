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

export const shapeUtils: TLShapeUtilsMap<Shape> = {
  box: new BoxUtil(),
}

export default class App extends React.Component<AppProps> {
  initialDocument: AppState
  document: AppState
  interval: any  
  state: {
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
    }

    this.state = {
      sync_state: SYNC_STATE.LOADING,
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

  componentWillMount() {
    if (this.connected) this._subscribe()
  }

  componentWillUnmount() {
    this._unsubscribe()
  }
  
  _unsubscribe() {
    this.setState({ sync_state: SYNC_STATE.OFFLINE })
    if (this.interval) clearInterval(this.interval)
    this.interval = false
  }

  _subscribe() {
    this.setState({ sync_state: SYNC_STATE.LOADING })
    let fetch = () => {
      http.getItem(this.props.id).then((doc: Automerge.Doc<AppState>) => {
        if (Automerge.equals(this.document, doc)) {
          this.setState({ sync_state: SYNC_STATE.SYNCED })
        } else {
          this.setState({ sync_state: SYNC_STATE.LOADING })
          let changes = Automerge.getChanges(this.initialDocument, doc)
          let [document, patch] = Automerge.applyChanges<AppState>(this.document, changes)

          this.document = document
          this.setState({
            page: document
          })
          this.persist()
          this.saveToNetwork()
        }
      }).catch(err => {
        this.saveToNetwork()
        this.setState({ sync_state: SYNC_STATE.ERROR }) 
        console.error(err)
      })
    }
    if (!this.interval) this.interval = setInterval(fetch, 500);
  }

  updateState (changeFn: Automerge.ChangeFn<AppState>) {
    this.document = Automerge.change<AppState>(this.document, changeFn)
    this.setState({
      page: this.document
    })
    this.persist()
    this.saveToNetwork()
  }

  saveToNetwork() {
    if (this.connected) http.setItem(this.props.id, this.document)
  }

  persist () {
    storage.setItem(this.props.id, this.document)
  }

  get connected() {
    return this.state.sync_state !== SYNC_STATE.OFFLINE
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
      this.setState({
        pageState: {
          ...this.state.pageState,
          hoveredId: e.target
        }
      })
    }

    const onUnhoverShape = (e: TLPointerInfo) => {
      this.setState({
        pageState: {
          ...this.state.pageState,
          hoveredId: undefined
        }
      })
    }

    const onPointShape = (e: TLPointerInfo) => {
      if (this.state.pageState.selectedIds.includes(e.target)) return
      else this.setState({
        pageState: {
          ...this.state.pageState,
          selectedIds: [e.target],
        }
      })
    }

    const onReleaseShape = (e: TLPointerInfo) => {
      const shape = this.state.page.shapes[e.target]
      if (this.document.shapes[e.target] === shape) return
      this.document = Automerge.change<AppState>(this.document, (doc: AppState) => {
        doc.shapes[e.target].point = shape.point
      })
      this.persist()
      this.saveToNetwork()
    }

    const onDragShape = (e: TLPointerInfo) => {
      // TODO: this is creating a change and saving the automerge document to disk for every drag. 
      // instead, let's only save it every 500ms or something?
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
      this.persist()
      this.saveToNetwork()
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

    let onConnectClick = () => {
      if (this.connected) this._unsubscribe()
      else this._subscribe()
    }

    let onClearClick = () => {
      this._unsubscribe()
      http.deleteItem(this.document.id)
      localStorage.clear()
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
            <button onClick={onConnectClick}>{this.connected ? 'Disconnect' : 'Connect'}</button>
            <button onClick={onClearClick}>Clear</button>
          </div>
          <SyncIndicator state={this.state.sync_state} />
        </div>
      </div>
    )
  }
}
