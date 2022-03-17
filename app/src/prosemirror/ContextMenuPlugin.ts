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
      buttonEl.addEventListener('click', (e: any) => {
        button.handleClick(e, view, this.contextMenu, buttonEl)
      })
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
    ) {
      return
    }

    // Hide the menu if the selection is empty
    if (state.selection.empty) {
      this.contextMenu.style.display = 'none'
      return
    }

    this.contextMenu.style.display = 'block'

    // Otherwise, reposition it and update its content
    let { from, to } = state.selection
    // These are in screen coordinates
    let start = view.coordsAtPos(from),
      end = view.coordsAtPos(to)
    // Find a center-ish x position from the selection endpoints (when
    // crossing lines, end may be more to the left)
    this.contextMenu.style.position = 'fixed'
    let left = (start.left + end.left) / 2 - this.contextMenu.clientWidth / 2
    this.contextMenu.style.left = left + 'px'
    this.contextMenu.style.bottom = window.innerHeight - start.top + 5 + 'px'
  }

  destroy() {
    this.contextMenu.remove()
  }
}
