import { Decoration, DecorationSet } from 'prosemirror-view'
import { Plugin, PluginKey } from 'prosemirror-state'
import Documents from '../Documents'

let documents = Documents()

export const remoteCursorKey = new PluginKey('remoteCursor')

export const remoteCursorPlugin: () => Plugin = () => {
  return new Plugin({
    key: remoteCursorKey,

    state: {
      init(_, state) {
        // Create decoration set to collect decorations
        let deco: Decoration[] = []
        return DecorationSet.create(state.doc, deco)
      },

      apply(tr, cursors) {
        // this is not especially fast or efficient, but building a mutation map
        // is more complicated, so going with this for the moment.
        const newCursors = tr.getMeta(remoteCursorKey)

        if (newCursors) {
          let decorations = Object.keys(newCursors).map((author) => {
            let cursor = newCursors[author]
            let { from, to } = cursor
            if (from === to) {
              let cursorElement = window.document.createElement('span')
              cursorElement.style.borderRight = `2px solid ${documents.upwell.getAuthorColor(
                author
              )}`
              cursorElement.style.boxSizing = 'content-box'
              cursorElement.style.marginLeft = '-2px'
              return Decoration.widget(from, cursorElement)
            } else {
              return Decoration.inline(from, to, {
                style: `background: ${documents.upwell.getAuthorColor(author)}`,
              })
            }
          })
          return DecorationSet.create(tr.doc, decorations)
        } else {
          // just update the positions of the decorations
          return cursors.map(tr.mapping, tr.doc)
        }
      },
    },

    props: {
      decorations(state) {
        return remoteCursorKey.getState(state)
      },
    },
  })
}
