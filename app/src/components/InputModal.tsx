import * as React from 'react'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import { useState } from 'react'
import { Button } from './Button'

type InputModalProps = {
  onCreateDraft?: Function
  open: boolean
  onClose: Function
  defaultValue: string
}
export default function InputModal({
  onCreateDraft,
  open,
  defaultValue,
  onClose,
}: InputModalProps) {
  const [text, setText] = useState(defaultValue || '')

  const handleClose = () => {
    onClose()
  }
  const handleCreateDraft = (e: any) => {
    e.preventDefault()
    if (!onCreateDraft) {
      throw new Error('Pass onCreateDraft to modal. Could not find function')
    }
    if (text.length) {
      onCreateDraft(text)
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Name your changes</DialogTitle>
      <form>
        <DialogContent>
          <TextField
            autoFocus
            id="draft-name-input"
            label="Draft name"
            defaultValue={defaultValue}
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
          <Button variant="outlined" onClick={handleCreateDraft} type="submit">
            OK
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
