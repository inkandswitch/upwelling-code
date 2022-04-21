import * as React from 'react'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import { Button } from './Button'

type ConfirmModalProps = {
  onSubmit?: Function
  open: boolean
  onClose: Function
  title?: string
  message?: string
}
export default function ConfirmModal({
  onSubmit,
  open,
  onClose,
  title = 'Name your changes',
  message = '',
}: ConfirmModalProps) {
  const handleClose = () => {
    onClose()
  }
  const handleSubmit = (e: any) => {
    e.preventDefault()
    if (!onSubmit) {
      throw new Error('Pass onSubmit to modal. Could not find function')
    }
    onSubmit()
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>{title}</DialogTitle>
      <form>
        <DialogContent>{message}</DialogContent>
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
