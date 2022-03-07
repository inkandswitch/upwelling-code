/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import { AttributesOf } from '@atjson/document'
import * as React from 'react'
import { Insertion as Annotation } from '../upwell-source'

export const Insert: React.FC<AttributesOf<Annotation>> = (props) => {
  return (
    <span
      css={css`
        color: ${props.authorColor || 'green'};
      `}
      className="insertion"
    >
      {props.children}
    </span>
  )
}
