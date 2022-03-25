import { EditorView } from 'prosemirror-view'
import { schema } from '../UpwellSchema'
import deterministicColor from '../../color'
import { Author } from 'api'

export const commentButton = (author: Author) => {
  return {
    view: () => {
        let commentButton = document.createElement('button')
        commentButton.innerText = '💬'
        return commentButton
    },

    handleClick: (
        e: any,
        view: EditorView,
        contextMenu: HTMLDivElement,
        buttonEl: HTMLButtonElement
    ) => {
        let { from, to } = view.state.selection
        let message = prompt('what is your comment')
        let commentMark = schema.mark('comment', {
        id: 'new-comment',
        author: author,
        authorColor: deterministicColor(author.id),
        message,
        })
        let tr = view.state.tr.addMark(from, to, commentMark)
        view.dispatch(tr)

        contextMenu.style.display = 'none'
    },
  }
}