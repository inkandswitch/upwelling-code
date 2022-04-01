/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React from 'react'

export const InfoText = (props: any) => (
  <small
    css={css`
      color: gray;
      display: block;
      margin-top: 0.4rem;
    `}
    {...props}
  />
)
