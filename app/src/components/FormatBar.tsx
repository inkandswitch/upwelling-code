/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import * as React from 'react'
import { IconButton } from '@mui/material'

import { editorSharedCSS } from './Editor'
import { ReactComponent as Bold } from '../components/icons/format/Bold.svg'
import { ReactComponent as Italic } from '../components/icons/format/Italic.svg'
import { ReactComponent as H1 } from '../components/icons/format/H1.svg'
import { ReactComponent as H2 } from '../components/icons/format/H2.svg'
import { ReactComponent as H3 } from '../components/icons/format/H3.svg'
import { ReactComponent as Text } from '../components/icons/format/Text.svg'

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
        <IconButton aria-label="bold" title="ctrl-b or cmd+b">
          <Bold />
        </IconButton>
        <IconButton aria-label="italic" title="ctrl-i or cmd-i">
          <Italic />
        </IconButton>
        <IconButton aria-label="heading 1" title="ctrl-alt-1">
          <H1 />
        </IconButton>
        <IconButton aria-label="heading 2" title="ctrl-alt-2">
          <H2 />
        </IconButton>
        <IconButton aria-label="heading 3" title="ctrl-alt-3">
          <H3 />
        </IconButton>
        <IconButton aria-label="text" title="ctrl-alt-0">
          <Text />
        </IconButton>
      </div>
    </div>
  )
}
