import * as React from 'react'
import { EditorView } from 'prosemirror-view'
import { schema } from '../UpwellSchema'
import deterministicColor from '../../color'
import { Author } from 'api'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import { useState } from 'react'
import Button from '@mui/material/Button'

type CommentModalProps = {
  onSubmitComment: Function
}
function CommentModal({ onSubmitComment }: CommentModalProps) {
  const [open, setOpen] = React.useState(false)
  const [text, setText] = useState('')

  const handleClickOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  const handleSubmitComment = () => {
    onSubmitComment(text)
    handleClose()
  }

  return (
    <div>
      <Button variant="outlined" onClick={handleClickOpen}>
        New Draft
      </Button>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>New draft</DialogTitle>
        <form>
          <DialogContent>
            <TextField
              autoFocus
              id="comment-input"
              label="Comment"
              type="textarea"
              fullWidth
              variant="standard"
              onChange={(e) => setText(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button variant="outlined" color="error" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="outlined"
              onClick={handleSubmitComment}
              type="submit"
            >
              Create
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  )
}

export const commentButton = (author: Author) => {
  return {
    view: () => {
      // let commentButton = document.createElement('button')
      // commentButton.innerText = '💬'
      // return commentButton

      return <Button variant="outlined">💬</Button>
    },

    handleClick: (
      e: any,
      view: EditorView,
      contextMenu: HTMLDivElement
      // buttonEl: HTMLButtonElement
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
