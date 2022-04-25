import * as React from 'react'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import { useState } from 'react'
import { Button } from './Button'
import { getTempDraftName } from '../util'

type InputModalProps = {
  onSubmit?: Function
  open: boolean
  onClose: Function
  title?: string
  author?: string
}
export default function InputModal({
  onSubmit,
  open,
  onClose,
  title = 'Name your changes',
  author = '',
}: InputModalProps) {
  const [text, setText] = useState(getTempDraftName({ author }))

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
      <DialogTitle>{title}</DialogTitle>
      <form>
        <DialogContent>
          <TextField
            autoFocus
            id="draft-name-input"
            label="Draft name"
            type="text"
            fullWidth
            variant="standard"
            value={text}
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
