/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import * as React from 'react'
import { IconButton } from '@mui/material'

import { editorSharedCSS } from './Editor'
import { ReactComponent as Bold } from '../components/icons/format/Bold.svg'
import { ReactComponent as Italic } from '../components/icons/format/Italic.svg'

export default function FormatBar() {
  return (
    <div
      css={css`
        border-bottom: 1px solid lightgray;
        ${editorSharedCSS}
        padding-top: 2px;
        padding-bottom: 2px;
      `}
    >
      <div
        css={css`
          margin-left: -12px;
        `}
      >
        <IconButton aria-label="bold">
          <Bold />
        </IconButton>
        <IconButton aria-label="italic">
          <Italic />
        </IconButton>
      </div>
    </div>
  )
}
