import { AuthorColorsType } from '../components/ListDocuments'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { Plugin, PluginKey } from 'prosemirror-state'

export const remoteCursorKey = new PluginKey('remoteCursor')

export const remoteCursorPlugin: (colors: AuthorColorsType) => Plugin = (
  colors: AuthorColorsType
) => {
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
            return Decoration.inline(from, to + 1, {
              style: `border-left: 2px solid ${colors[author]}; margin-left: -2px`,
            })
          } else {
            return Decoration.inline(from, to, {
              style: `background: ${colors[author]}`,
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
