import { EditorView } from 'prosemirror-view'
import { schema } from '../UpwellSchema'
import { Author } from 'api'
import Documents from '../../Documents'

let documents = Documents()

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
        authorColor: documents.upwell.getAuthorColor(author.id),
      })
      let tr = view.state.tr.addMark(from, to, commentMark)
      view.dispatch(tr)

      contextMenu.style.display = 'none'
    },
  }
}
