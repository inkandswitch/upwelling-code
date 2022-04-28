/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import * as React from 'react'
import { ReactComponent as Shared } from '../components/icons/Shared.svg'
import { ReactComponent as Private } from '../components/icons/Private.svg'
import { IconButton } from './Button'

type Props = {
  isShared: boolean
  onShareSelect: React.MouseEventHandler<HTMLButtonElement>
}

export default function ShareButton({ isShared, onShareSelect }: Props) {
  return isShared ? (
    <IconButton
      css={css`
        padding: 3px;
        &:disabled {
          cursor: default;
        }
      `}
      icon={Shared}
      disabled
      title="Shared draft"
    />
  ) : (
    <IconButton
      css={css`
        border: 1px solid gray;
        padding: 2px;
      `}
      icon={Private}
      onClick={onShareSelect}
      title="Private draft"
    />
  )
}
