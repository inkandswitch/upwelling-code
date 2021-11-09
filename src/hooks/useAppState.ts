import type { TLKeyboardEventHandler, TLPage, TLPageState, TLPointerEventHandler, TLShapeChangeHandler } from '@tldraw/core'
import Vec from '@tldraw/vec'
import * as React from 'react'
import type { Shape } from '../shapes'
import { nanoid } from 'nanoid';
import { TLPointerInfo } from '@tldraw/core';
import * as Automerge from 'automerge';

type Binding = any;

type AppState = {
  id: string,
  shapes: Record<string, Shape>
  bindings: Record<string, Binding> 

}

let document = Automerge.change(Automerge.init<AppState>('0000'), { time: 0 }, (doc: AppState) => {
  doc.id = 'page1'
  doc.shapes = {}
  doc.bindings = {}
  
  let shape: Shape = {
    id: 'box1',
    type: 'box',
    parentId: 'page1',
    name: 'Box',
    childIndex: 0,
    rotation: 0,
    isLocked: false,
    point: [0, 0],
    size: [100, 100],
  }
  doc.shapes[shape.id] = shape
})

export function useAppState() {
  /* -------------------- Document -------------------- */

  const [page, setPage] = React.useState<TLPage<Shape>>({
    id: document.id, 
    shapes: document.shapes,
    bindings: document.bindings,
  })

  const [pageState, setPageState] = React.useState<TLPageState>({
    id: 'page1',
    selectedIds: [],
    hoveredId: undefined,
    camera: {
      point: [0, 0],
      zoom: 1,
    },
  })

  const [meta] = React.useState({
    isDarkMode: false,
  })

  /* ---------------------- Theme --------------------- */

  const theme = React.useMemo(
    () =>
      meta.isDarkMode
        ? {
            accent: 'rgb(255, 0, 0)',
            brushFill: 'rgba(0,0,0,.05)',
            brushStroke: 'rgba(0,0,0,.25)',
            selectStroke: 'rgb(66, 133, 244)',
            selectFill: 'rgba(65, 132, 244, 0.05)',
            background: 'rgb(248, 249, 250)',
            foreground: 'rgb(51, 51, 51)',
          }
        : {
            accent: 'rgb(255, 0, 0)',
            brushFill: 'rgba(0,0,0,.05)',
            brushStroke: 'rgba(0,0,0,.25)',
            selectStroke: 'rgb(66, 133, 244)',
            selectFill: 'rgba(65, 132, 244, 0.05)',
            background: 'rgb(248, 249, 250)',
            foreground: 'rgb(51, 51, 51)',
          },
    [meta]
  )

  /* --------------------- Events --------------------- */

  const onDoubleClickCanvas = React.useCallback<TLPointerEventHandler>((e: TLPointerInfo) => {
    setPage((page => {
      let shape = {
        id: nanoid(),
        type: 'box',
        name: 'Box',
        parentId: 'page1',
        isLocked: false,
        point: e.point,
        size: [100, 100],
        childIndex: Object.values(page.shapes).length
      } as Shape 
      document = Automerge.change(document, (doc) => {
        doc.shapes[shape.id] = shape
      })
      return {
        ...page,
        shapes: {
          ...page.shapes,
          [shape.id]: shape
        }
      }
    }))
  }, [])

  const onHoverShape = React.useCallback<TLPointerEventHandler>((e) => {
    setPageState((pageState) => {
      console.log('onHover, pageState', pageState)
      return {
        ...pageState,
        hoveredId: e.target,
      }
    })
  }, [])

  const onUnhoverShape = React.useCallback<TLPointerEventHandler>(() => {
    setPageState((pageState) => {
      console.log('onUnhover, pageState', pageState)
      return {
        ...pageState,
        hoveredId: undefined,
      }
    })
  }, [])

  const onPointShape = React.useCallback<TLPointerEventHandler>((e) => {
    setPageState((pageState) => {
      let newState = pageState.selectedIds.includes(e.target)
        ? pageState
        : {
            ...pageState,
            selectedIds: [e.target],
          }
      console.log(newState)
      return newState
    })
  }, [])

  const onDragShape = React.useCallback<TLPointerEventHandler>(
    (e) => {
      setPage((page) => {
        const shape = page.shapes[e.target]
        console.log('shape is locked?', shape.isLocked)
        console.log('selectedIds', pageState.selectedIds)
        if (shape.isLocked) return page

        document = Automerge.change(document, doc => {
          doc.shapes[shape.id].point = Vec.sub(e.point, Vec.div(shape.size, 2))
        })

        return {
          ...page,
          shapes: {
            ...page.shapes,
            [shape.id]: document.shapes[shape.id]
          },
        }
      })
    },
    [setPage, pageState]
  )


  const onKeyDown = React.useCallback<TLKeyboardEventHandler>((key, info, e) => {
    switch (key) {
      case 'l': {
        document = Automerge.change(document, (doc) => {
          console.log('locking shape', pageState.selectedIds)
          pageState.selectedIds.forEach(id => {
            doc.shapes[id].isLocked = !doc.shapes[id].isLocked
          })
        })

        setPage((page) => {
          page.shapes = document.shapes
          return page
        })
      }
    }
  }, [pageState.selectedIds])


  const onShapeChange = React.useCallback<TLShapeChangeHandler<Shape>>((changes) => {
    setPage((page) => {
      const shape = page.shapes[changes.id]
      console.log('changing shape', shape)

      return {
        ...page,
        shapes: {
          ...page.shapes,
          [shape.id]: {
            ...shape,
            ...changes,
          } as Shape,
        },
      }
    })
  }, [])

  return {
    page,
    pageState,
    meta,
    theme,
    events: {
      onHoverShape,
      onUnhoverShape,
      onKeyDown,
      onDoubleClickCanvas,
      onPointShape,
      onDragShape,
      onShapeChange
    },
  }
}
