/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import * as React from 'react'
import { ReactComponent as Shared } from '../components/icons/Shared.svg'
import { ReactComponent as Private } from '../components/icons/Private.svg'
import { Button, buttonIconStyle } from './Button'

type Props = {
  isShared: boolean
  onShareSelect: React.MouseEventHandler<HTMLButtonElement>
}

export default function ShareButton({ isShared, onShareSelect }: Props) {
  return isShared ? (
    <Button
      css={css`
        ${buttonIconStyle}
        &:disabled {
          border-color: transparent;
        }
      `}
      variant="outlined"
      aria-label="shared"
      disabled
      title="Shared draft"
    >
      <Shared />
    </Button>
  ) : (
    <Button
      css={buttonIconStyle}
      variant="outlined"
      aria-label="private, make shared"
      onClick={onShareSelect}
      title="Private draft"
    >
      <Private />
    </Button>
  )
}
