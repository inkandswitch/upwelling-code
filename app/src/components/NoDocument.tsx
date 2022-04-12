/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React from 'react'

export default function NoDocument(props: any) {
  return (
    <div>
      <div
        css={css`
          font-family: serif;
          display: flex;
          flex-direction: column;
          background: #f9f9fa;
          align-items: center;
          width: 100%;
          height: 100vh;
          align-self: center;
          justify-content: center;
          text-align: center;
          button {
            border: 1px solid white;
          }
        `}
      >
        {props.children}
      </div>
    </div>
  )
}
