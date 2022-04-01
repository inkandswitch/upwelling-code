import { EditorView } from 'prosemirror-view'
import { schema } from '../UpwellSchema'
import deterministicColor from '../../color'
import { Author } from 'api'

export const undoButton = (author: Author) => {
  return {
    view: () => {
      let undoButton = document.createElement('button')
      undoButton.innerText = 'x'
      return undoButton
    },

    handleClick: (
      e: any,
      view: EditorView,
      contextMenu: HTMLDivElement,
      buttonEl: HTMLButtonElement
    ) => {
      let { from, to } = view.state.selection
      let commentMark = schema.mark('undo', {
        id: 'new-undo',
        author: author,
        authorColor: deterministicColor(author.id),
      })
      let tr = view.state.tr.addMark(from, to, commentMark)
      view.dispatch(tr)

      contextMenu.style.display = 'none'
    },
  }
}
