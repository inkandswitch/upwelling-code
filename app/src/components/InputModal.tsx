import * as React from 'react'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import { useState } from 'react'
import { Button } from './Button'

type InputModalProps = {
  onSubmit?: Function
  open: boolean
  onClose: Function
  title?: string
}
export default function InputModal({
  onSubmit,
  open,
  onClose,
  title = 'Name your changes',
}: InputModalProps) {
  const [text, setText] = useState('')

  const handleClose = () => {
    onClose()
  }
  const handleSubmit = (e: any) => {
    e.preventDefault()
    if (!onSubmit) {
      throw new Error('Pass onSubmit to modal. Could not find function')
    }
    if (text.length) {
      onSubmit(text)
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={handleClose}>
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
          <Button variant="outlined" onClick={handleSubmit} type="submit">
            OK
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
