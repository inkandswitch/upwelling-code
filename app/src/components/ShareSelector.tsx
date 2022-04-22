import * as React from 'react'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import Select, { SelectChangeEvent } from '@mui/material/Select'

enum ShareState {
  PRIVATE = 'PRIVATE',
  LISTED = 'LISTED',
}

type Props = {
  isShared: boolean
  onShareSelect: Function
  onPrivateSelect: Function
}

export default function ShareSelector({
  isShared,
  onShareSelect,
  onPrivateSelect,
}: Props) {
  const [shareState, setShareState] = React.useState(
    isShared ? ShareState.LISTED : ShareState.PRIVATE
  )

  const handleChange = (event: SelectChangeEvent) => {
    const { value } = event.target

    switch (value) {
      case ShareState.PRIVATE:
        onPrivateSelect()
        setShareState(ShareState.PRIVATE)
        break
      case ShareState.LISTED:
        onShareSelect()
        setShareState(ShareState.LISTED)
        break
    }
  }

  return (
    <div>
      <FormControl sx={{ m: 1, minWidth: 120, margin: 0 }} size="small">
        <Select
          value={shareState}
          onChange={handleChange}
          sx={{ height: 36.5 }}
        >
          <MenuItem value={ShareState.PRIVATE}>Private</MenuItem>
          <MenuItem disabled>Share with...</MenuItem>
          <MenuItem value={ShareState.LISTED}>Shared</MenuItem>
        </Select>
      </FormControl>
    </div>
  )
}
