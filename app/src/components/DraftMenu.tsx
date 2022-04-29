import * as React from 'react'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import { ReactComponent as VerticalDots } from '../components/icons/VerticalDots.svg'
import InputModal from './InputModal'

type Props = {
  onShare?: Function
  onEditName?: Function
  onDelete?: any
}

export default function DraftMenu({ onShare, onEditName, onDelete }: Props) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const [showDraftNameModal, setShowDraftNameModal] = React.useState(false)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }
  const handleClose = () => {
    setAnchorEl(null)
  }
  const handleShare = () => {
    if (onShare) {
      onShare()
    }
    handleClose()
  }
  const handleEditName = (name: string) => {
    if (onEditName) {
      onEditName(name)
    }
    handleClose()
  }
  const handleDelete = () => {
    if (onDelete) {
      onDelete()
    }
    handleClose()
  }

  return (
    <div>
      <IconButton
        id="draft-actions-positioned-button"
        aria-controls={open ? 'draft-actions-positioned-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleClick}
      >
        <VerticalDots />
      </IconButton>
      <Menu
        id="draft-actions-positioned-menu"
        aria-labelledby="draft-actions-positioned-button"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <MenuItem disabled={!onShare} onClick={handleShare}>
          Share link...
        </MenuItem>
        <MenuItem
          disabled={!onEditName}
          onClick={() => {
            handleClose()
            setShowDraftNameModal(true)
          }}
        >
          Edit name...
        </MenuItem>
        <MenuItem disabled={!handleDelete} onClick={onDelete}>
          Delete
        </MenuItem>
      </Menu>
      <InputModal
        title="Edit draft name"
        open={showDraftNameModal}
        onSubmit={handleEditName}
        onClose={() => setShowDraftNameModal(false)}
      />
    </div>
  )
}
