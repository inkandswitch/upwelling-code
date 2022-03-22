/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import { AttributesOf } from '@atjson/document'
import * as React from 'react'
import { Deletion as Annotation } from '../upwell-source'

export const Delete: React.FC<AttributesOf<Annotation>> = (props) => {
  return (
    <span
      css={css`
        &:hover .text {
          display: inline;
        }

        &:hover .mark {
          display: none;
        }
      `}
      className="deletion"
    >
      <span
        className="mark"
        css={css`
          width: 5px;
          color: ${props.authorColor?.toString() || 'red'};
        `}
      >
        ⌫
      </span>
      <span
        className="text"
        css={css`
          color: ${props.authorColor?.toString() || 'red'};
          text-decoration: line-through;
          display: none;
        `}
      >
        {props.text}
      </span>
    </span>
  )
}
