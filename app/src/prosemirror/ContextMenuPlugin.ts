import { EditorState, Plugin } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'

export function contextMenu(buttons: any[]) {
  return new Plugin({
    view(editorView) {
      return new ContextMenu(editorView, buttons)
    },
  })
}

class ContextMenu {
  contextMenu: HTMLDivElement

  constructor(view: EditorView, buttons: any[]) {
    this.contextMenu = document.createElement('div')
    this.contextMenu.className = 'tooltip'
    view.dom.parentNode!.appendChild(this.contextMenu)

    for (let button of buttons) {
      let buttonEl = button.view()
      buttonEl.addEventListener('click', (e: any) =>
        button.handleClick(e, view)
      )
      this.contextMenu.appendChild(buttonEl)
    }

    this.update(view, null)
  }

  update(view: EditorView, lastState: EditorState | null) {
    let state = view.state

    // Don't do anything if the document/selection didn't change
    if (
      lastState &&
      lastState.doc.eq(state.doc) &&
      lastState.selection.eq(state.selection)
    )
      return

    // Hide the menu if the selection is empty
    if (state.selection.empty) {
      this.contextMenu.style.display = 'none'
      return
    }

    // Otherwise, reposition it and update its content
    this.contextMenu.style.display = ''
    let { from, to } = state.selection
    // These are in screen coordinates
    let start = view.coordsAtPos(from),
      end = view.coordsAtPos(to)
    // The box in which the menu is positioned, to use as base
    if (!this.contextMenu.offsetParent) {
      this.contextMenu.style.display = 'none'
      this.contextMenu.style.position = 'relative'
      return
    }
    let box = this.contextMenu.offsetParent.getBoundingClientRect()
    // Find a center-ish x position from the selection endpoints (when
    // crossing lines, end may be more to the left)
    let left =
      Math.max((start.left + end.left) / 2, start.left + 3) -
      this.contextMenu.getBoundingClientRect().width / 2
    this.contextMenu.style.left = left - box.left + 'px'
    this.contextMenu.style.bottom = box.bottom - start.top + 5 + 'px'
    this.contextMenu.style.position = 'absolute'
  }

  destroy() {
    this.contextMenu.remove()
  }
}
