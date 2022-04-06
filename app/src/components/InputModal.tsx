import * as React from 'react'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import { useState } from 'react'
import { Button } from './Button'

type InputModalProps = {
  onCreateDraft: Function
}
export default function InputModal({ onCreateDraft }: InputModalProps) {
  const [open, setOpen] = React.useState(false)
  const [text, setText] = useState('')

  const handleClickOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }
  const handleCreateDraft = () => {
    onCreateDraft(text)
    setOpen(false)
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
              id="draft-name-input"
              label="Draft name"
              type="text"
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
              onClick={handleCreateDraft}
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
