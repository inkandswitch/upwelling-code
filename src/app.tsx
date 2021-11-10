import * as React from 'react'
import { BoxUtil, Shape } from './shapes'
import { TLShapeUtilsMap, Renderer, TLKeyboardEventHandler, TLKeyboardInfo, TLPageState } from '@tldraw/core'
import Vec from '@tldraw/vec'
import { nanoid } from 'nanoid';
import { TLPointerInfo } from '@tldraw/core';
import * as Automerge from 'automerge';
import * as storage from './storage/localStorage';
import * as http from './storage/http';

export const shapeUtils: TLShapeUtilsMap<Shape> = {
  box: new BoxUtil(),
}

type Binding = any;

type AppState = {
  id: string,
  shapes: Record<string, Shape>
  bindings: Record<string, Binding> 
}

type AppProps = {
  id: string
}

export default class App extends React.Component<AppProps> {
  document: AppState
  state: {
    page: AppState,
    pageState: TLPageState
  }

  constructor(props: AppProps) {
    super(props)

    let saved = storage.getItem(props.id)

    if (saved) {
      this.document = Automerge.load(saved as Automerge.BinaryDocument)
    } else {
      this.document = Automerge.change(Automerge.init<AppState>('0000'), { time: 0 }, (doc: AppState) => {
        doc.id = props.id
        doc.shapes = {}
        doc.bindings = {}
      })
    }

    this.state = {
      page: {
        id: this.document.id,
        shapes: this.document.shapes,
        bindings: this.document.bindings,
      },
      pageState: {
        id: this.document.id,
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
    http.getItem(this.props.id).then((doc: Automerge.BinaryDocument) => {
      let newDoc = Automerge.load<AppState>(doc)
      this.document = Automerge.merge<AppState>(this.document, newDoc)
      this.setState({
        page: this.document
      })
    }).catch(err => {
      console.error(err)
    })
  }
  updateState (changeFn: Automerge.ChangeFn<AppState>) {
    this.document = Automerge.change<AppState>(this.document, changeFn)
    this.setState({
      page: this.document
    })
    this.persist()
  }

  persist () {
    console.log('saving')
    storage.setItem(this.document.id, this.document)
    http.setItem(this.document.id, this.document)
  }
  
  render() {
    const onDoubleClickCanvas = (e: TLPointerInfo) => {
      let shape = {
        id: nanoid(),
        type: 'box',
        name: 'Box',
        parentId: this.document.id,
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

    let meta = {}
  
    return (
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
    )
  }
}
