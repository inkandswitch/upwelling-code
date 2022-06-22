/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import * as React from 'react'
import ReactDOM from 'react-dom'
import { EditorView } from 'prosemirror-view'
import { schema } from '../UpwellSchema'
import { Author } from 'api'
import TextField from '@mui/material/TextField'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import { useState } from 'react'
import Button from '@mui/material/Button'
import Popover from '@mui/material/Popover'
import Documents from '../../Documents'

let documents = Documents()

type CommentModalProps = {
  view: EditorView
  contextMenu: HTMLDivElement
  to: any
  from: any
  author: Author
  onClose: Function
}
function CommentModal({
  author,
  view,
  contextMenu,
  to,
  from,
  onClose,
}: CommentModalProps) {
  const [comment, setComment] = useState('')
  const [open, setOpen] = React.useState(true)

  const handleClose = () => {
    onClose()
    setOpen(false)
  }

  const handleSubmitComment = (e: any) => {
    e.preventDefault()
    let commentMark = schema.mark('comment', {
      id: 'new-comment',
      author,
      authorColor: documents.upwell!.getAuthorColor(author.id),
      message: comment,
    })
    let tr = view.state.tr.addMark(from, to, commentMark)
    view.dispatch(tr)

    handleClose()
  }

  let coords = view.coordsAtPos(from)
  let editorClientRect = view.dom.getBoundingClientRect()
  let rightMargin = editorClientRect.right - editorClientRect.width / 10

  return (
    <Popover
      open={open}
      onClose={handleClose}
      anchorReference="anchorPosition"
      anchorPosition={{ left: rightMargin, top: coords.top }}
    >
      <form id="comment-area">
        <DialogContent>
          <TextField
            autoFocus
            id="comment-input"
            label="Comment"
            type="textarea"
            fullWidth
            variant="standard"
            onChange={(e) => setComment(e.target.value)}
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
    </Popover>
  )
}

const button = (
  <Button
    css={css`
      background: white;
      display: block;
    `}
    variant="contained"
  >
    💬
  </Button>
)

export const commentButton = (author: Author) => {
  const el = document.createElement('div')

  return {
    view: () => {
      ReactDOM.render(button, el)
      return el
    },

    handleClick: (
      e: React.ChangeEvent<HTMLInputElement>,
      view: EditorView,
      contextMenu: HTMLDivElement,
      buttonEl: HTMLButtonElement
    ) => {
      let { from, to } = view.state.selection
      const el2 = document.createElement('div')
      contextMenu.style.display = 'none'

      return ReactDOM.render(
        <CommentModal
          view={view}
          contextMenu={contextMenu}
          to={to}
          from={from}
          author={author}
          onClose={() => {}}
        />,
        el2
      )
    },
  }
}
