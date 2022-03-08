/** @jsxImportSource @emotion/react */
import { css, Interpolation, Theme } from '@emotion/react/macro'
import React from 'react'
import { Layer } from 'api'
import { JSX } from '@emotion/react/jsx-runtime'
//@ts-ignore
import relativeDate from 'relative-date'
import { HCLColor } from 'd3-color'
import Documents from '../Documents'

let documents = Documents()

type ID = string
export type AuthorColorsType = {
  [key: ID]: HCLColor
}

const tabStyles = css`
  height: 100px;
  pointer: cursor;
  padding: 20px;
  margin: 20px;
  border: 1px solid black;
`

const wiggleStyle = css``

export const InfoTab = (
  props: JSX.IntrinsicAttributes & {
    css?: Interpolation<Theme>
  } & React.ClassAttributes<HTMLDivElement> &
    React.HTMLAttributes<HTMLDivElement> & { css?: Interpolation<Theme> }
) => (
  <div
    css={css`
      ${tabStyles};
      background: none;
      border: none;
      color: white;
    `}
    {...props}
  />
)

export const ButtonTab = (
  props: JSX.IntrinsicAttributes & {
    css?: Interpolation<Theme>
  } & React.ClassAttributes<HTMLDivElement> &
    React.HTMLAttributes<HTMLDivElement> & { css?: Interpolation<Theme> }
) => (
  <div
    css={css`
      ${tabStyles};
      ${wiggleStyle}
      display: inline-block;
      border-radius: 0 6px 6px 0;
      background: white;
      cursor: pointer;
    `}
    role="button"
    {...props}
  />
)

type TabType = {
  index: number
  isBottom?: boolean
  isMerged?: boolean
} & React.ClassAttributes<HTMLDivElement> &
  React.ButtonHTMLAttributes<HTMLDivElement>

const fileTabBottomStyles = css`
  border-width: 1px 1px 0px 1px;
  margin-top: 0;
  margin-bottom: -6px;
`
const fileTabMergedStyles = css`
  background: gray;
  border-color: #4d4d4d;
  border-left-color: transparent;
  &:hover {
    background: gray;
  }
`

export const FileTab = ({
  index,
  isBottom = false,
  isMerged = false,
  ...props
}: TabType) => (
  <div
    css={css`
      ${tabStyles};
      z-index: ${isBottom ? 1000 - index : 1000 + index};
      &:hover {
        background: #d1eaff;
      }
      &:first-of-type {
        border-radius: 0 10px 10px 0;
      }
      ${isBottom ? fileTabBottomStyles : ''}
      ${isMerged ? fileTabMergedStyles : ''}
    `}
    role="button"
    onClick={props.onClick}
    {...props}
  />
)

type Props = {
  onLayerClick: Function
  id: string
  layers: Layer[]
  isBottom?: boolean
  colors?: AuthorColorsType
}

export default function ListDocuments({
  onLayerClick,
  id,
  layers,
  isBottom = false,
  colors = {},
}: Props) {
  let upwell = documents.get(id)
  return (
    <div
      css={css`
        ${isBottom ? 'overflow: unset;' : ''}
      `}
    >
      {layers
        .sort((a, b) => b.time - a.time)
        .map((layer: Layer, index) => {
          const isMerged = upwell.isArchived(layer.id)
          return (
            <FileTab
              key={layer.id}
              index={index}
              isBottom={isBottom}
              isMerged={isMerged}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onLayerClick(layer)
              }}
              css={css`
                display: flex;
                flex-direction: row;
                justify-content: flex-start;
                align-items: flex-start;
                box-shadow: 18px 24px 0px -18px ${colors[
                    layer.author
                  ]?.toString() || 'none'} inset;
              `}
            >
              {/* <span css={{ color: "lightgray" }}>{layer.id.slice(0, 2)}</span> */}
              <div>
                {layer.id === upwell.rootLayer.id ? 'Latest' : layer.message}
                <div>
                  by {layer.author}, {relativeDate(new Date(layer.time))}
                </div>
              </div>
            </FileTab>
          )
        })}
    </div>
  )
}
