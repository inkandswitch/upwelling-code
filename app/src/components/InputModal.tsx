import * as React from 'react'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import { Button } from './Button'
import { useState } from 'react'

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
      <Button onClick={handleClickOpen}>New Draft</Button>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>New draft</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="draft-name-input"
            label="Draft name"
            type="text"
            fullWidth
            onChange={(e) => setText(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleCreateDraft}>Create</Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
