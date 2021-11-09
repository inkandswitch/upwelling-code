import { createState } from '@state-designer/react'
import type { TLPointerInfo } from '@tldraw/core'
import { INITIAL_DATA } from './constants'
import Vec from '@tldraw/vec'
import { getPagePoint } from './helpers'
import * as actions from './actions'
import { mutables } from './mutables'
import { getShapeUtils } from '../shapes/index';

export const machine = createState({
  data: INITIAL_DATA,
  onEnter: ['restoreSavedDocument', 'updateBoundShapes'],
  on: {
    SELECTED_TOOL: { to: (_, payload) => payload.name },
    STARTED_POINTING: ['setInitialPoint', 'setSnapshot'],
    PANNED: 'panCamera',
    PINCHED: 'pinchCamera',
    ZOOMED_TO_SELECTION: 'zoomToSelection',
    ZOOMED_TO_FIT: 'zoomToFit',
    ZOOMED_IN: 'zoomIn',
    ZOOMED_OUT: 'zoomOut',
    RESIZED: 'setViewport',
    RESET: {
      do: 'loadNewDocument',
      to: 'select.idle',
    },
    LOADED_DOCUMENT: {
      do: 'loadDocument',
      to: 'select.idle',
    },
    CREATED_SHAPES: ['createShapes', 'addToHistory'],
    UPDATED_SHAPES: ['updateShapes', 'updateBoundShapes', 'addToHistory'],
    DELETED_SHAPES: ['deleteShapes', 'updateBoundShapes', 'addToHistory'],
    CREATED_BINDINGS: ['createBindings', 'addToHistory'],
    UPDATED_BINDINGS: ['updateBindings', 'updateBoundShapes', 'addToHistory'],
    DELETED_BINDINGS: ['deleteBindings', 'updateBoundShapes', 'addToHistory'],
  },
  initial: 'select',
  states: {
    select: {
      initial: 'idle',
      states: {
        idle: {
          onEnter: ['clearPointedShape'],
          on: {
            SELECTED_ALL: 'selectAllShapes',
            DESELECTED_ALL: 'deselectAllShapes',
            CANCELLED: 'deselectAllShapes',
            DELETED: ['deleteSelectedShapes', 'addToHistory'],
            LOCKED: ['lockSelectedShapes', 'addToHistory'],
            UNDO: 'undo',
            REDO: 'redo',
            DOUBLE_CLICK: {
              to: 'box.creating'
            },
            HOVERED_SHAPE: 'setHoveredShape',
            UNHOVERED_SHAPE: 'clearHoveredShape',
            POINTED_CANVAS: [
              {
                unless: 'isPressingShiftKey',
                do: 'deselectAllShapes',
              },
              {
                to: 'pointing.canvas',
              },
            ],
            POINTED_SHAPE: [
              {
                unless: 'shapeIsSelected',
                do: 'selectShape',
              },
              { to: 'pointing.shape' },
            ],
            POINTED_BOUNDS: {
              to: 'pointing.bounds',
            },
            POINTED_HANDLE: {
              do: 'setPointedHandle',
              to: 'pointing.handle',
            },
            POINTED_BOUNDS_HANDLE: {
              do: 'setPointedBoundsHandle',
              to: 'pointing.boundsHandle',
            },
          },
        },
        pointing: {
          initial: 'canvas',
          states: {
            canvas: {
              on: {
                STOPPED_POINTING: {
                  to: 'select.idle',
                },
                MOVED_POINTER: {
                  to: 'brushSelecting',
                },
              },
            },
            boundsHandle: {
              on: {
                MOVED_POINTER: {
                  if: 'hasLeftDeadZone',
                  to: 'transforming',
                },
                STOPPED_POINTING: {
                  to: 'select.idle',
                },
              },
            },
            bounds: {
              on: {
                MOVED_POINTER: {
                  if: 'hasLeftDeadZone',
                  to: 'translating.shapes',
                },
                STOPPED_POINTING: {
                  do: 'deselectAllShapes',
                  to: 'select.idle',
                },
              },
            },
            shape: {
              on: {
                MOVED_POINTER: {
                  unless: 'shapeIsLocked',
                  if: 'hasLeftDeadZone',
                  to: 'translating.shapes',
                },
                STOPPED_POINTING: [
                  {
                    if: 'shapeIsSelected',
                    do: 'selectShape',
                  },
                  {
                    to: 'select.idle',
                  },
                ],
              },
            },
            handle: {
              on: {
                MOVED_POINTER: {
                  unless: 'shapeIsLocked',
                  if: 'hasLeftDeadZone',
                  to: 'translating.handle',
                },
                STOPPED_POINTING: {
                  do: 'clearPointedHandle',
                  to: 'select.idle',
                },
              },
            },
          },
        },
        translating: {
          onEnter: 'setSnapInfo',
          onExit: ['clearSnapInfo', 'clearSnapLines', 'clearIsCloning'],
          on: {
            CANCELLED: {
              do: 'restoreSnapshot',
              to: 'select.idle',
            },
            STOPPED_POINTING: {
              do: 'addToHistory',
              to: 'select.idle',
            },
          },
          initial: 'shapes',
          states: {
            shapes: {
              onEnter: 'removePartialBindings',
              on: {
                TOGGLED_MODIFIER: ['translateSelectedShapes', 'updateBoundShapes'],
                MOVED_POINTER: ['translateSelectedShapes', 'updateBoundShapes'],
                PANNED: ['translateSelectedShapes', 'updateBoundShapes'],
              },
            },
            handle: {
              on: {
                TOGGLED_MODIFIER: ['translateHandle', 'updateBoundShapes'],
                MOVED_POINTER: ['translateHandle', 'updateBoundShapes'],
                PANNED: ['translateHandle', 'updateBoundShapes'],
              },
            },
          },
        },
        transforming: {
          onEnter: ['setSnapInfo', 'setInitialCommonBounds'],
          onExit: ['clearSnapInfo', 'clearSnapLines', 'clearPointedBoundsHandle'],
          on: {
            TOGGLED_MODIFIER: ['transformSelectedShapes', 'updateBoundShapes'],
            MOVED_POINTER: ['transformSelectedShapes', 'updateBoundShapes'],
            PANNED: ['transformSelectedShapes', 'updateBoundShapes'],
            CANCELLED: {
              do: 'restoreSnapshot',
              to: 'select.idle',
            },
            STOPPED_POINTING: {
              do: 'addToHistory',
              to: 'select.idle',
            },
          },
        },
        brushSelecting: {
          onExit: 'clearBrush',
          on: {
            MOVED_POINTER: 'updateBrush',
            PANNED: 'updateBrush',
            CANCELLED: {
              to: 'select.idle',
            },
            STOPPED_POINTING: {
              to: 'select.idle',
            },
          },
        },
      },
    },
    box: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            STARTED_POINTING: {
              do: 'setInitialPoint',
              to: 'box.pointing',
            },
          },
        },
        pointing: {
          on: {
            MOVED_POINTER: {
              if: 'hasLeftDeadZone',
              to: 'box.creating',
            },
            STOPPED_POINTING: {
              to: 'box.idle',
            },
          },
        },
        creating: {
          onEnter: ['createBoxShape', 'setSnapshot'],
          on: {
            STOPPED_POINTING: {
              do: 'addToHistory',
              to: 'select'
            },
          },
        },
      },
    },
  }, 
  conditions: {
    hasLeftDeadZone(data, payload: TLPointerInfo) {
      return Vec.dist(getPagePoint(payload.point, data.pageState), mutables.initialPoint) > 3
    },
    shapeIsSelected(data, payload: { target: string }) {
      return data.pageState.selectedIds.includes(payload.target)
    },
    shapeIsPointed(data, payload: { target: string }) {
      return mutables.pointedShapeId === payload.target
    },
    shapeIsLocked(data, payload: {target: string }) {
      return data.page.shapes[payload.target].isLocked
    },
    isPressingShiftKey(data, payload: { shiftKey: boolean }) {
      return payload.shiftKey
    },
  },
  actions,
})
