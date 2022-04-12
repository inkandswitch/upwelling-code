/** @jsxImportSource @emotion/react */
import { css, Interpolation, Theme } from '@emotion/react/macro'
import React from 'react'
import { Draft } from 'api'
import { JSX } from '@emotion/react/jsx-runtime'
//@ts-ignore
import relativeDate from 'relative-date'
import { TextareaInput } from './Input'
import { EmojiButton } from './EmojiButton'
import Documents from '../Documents'
let documents = Documents()

const tabStyles = css`
  border: 1px #b9b9b9 solid;
  background: #eaeaea;
  border-left: 1px solid lightgray;
  margin-right: 16px;
  padding: 12px 10px 12px 10px;
  border-radius: 0 10px 10px 0; /* top rounded edges */
  box-sizing: content-box;
  line-height: 16px;
`

const extendedTabStyles = css`
  border: 1px lightgray solid;
  padding-left: 27px;
  margin-right: 0;
`

const tabVisibleStyles = css`
  ${extendedTabStyles}
  background: white;
  min-height: 60px;
  max-height: 120px;
`

const wiggleStyle = css`
  @keyframes wiggle {
    0% {
      transform: rotate(25deg);
    }
    20% {
      transform: rotate(-25deg);
    }
    35% {
      transform: rotate(0deg);
    }
    95% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(0deg);
    }
  }

  &:hover {
    display: inline-block;
    animation: wiggle 2.5s infinite;
  }
`

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
  'aria-pressed': boolean
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
  'aria-pressed': isVisible,
  ...props
}: TabType) => (
  <div
    css={css`
      ${tabStyles};
      min-height: 40px;
      text-align: end;
      margin-top: -6px;
      max-width: 110px;
      border-radius: 0 10px 10px 0;
      cursor: pointer;
      max-height: 80px;
      z-index: ${isBottom ? 1000 - index : 1000 + index};
      &:hover {
        background: #d1eaff;
      }
      &:first-of-type {
        border-radius: 0 10px 10px 0;
      }
      ${isVisible ? tabVisibleStyles : ''}
      ${isBottom ? fileTabBottomStyles : ''}
      ${isMerged ? fileTabMergedStyles : ''}
    `}
    role="button"
    onClick={props.onClick}
    {...props}
  />
)

export const sidewaysTabStyle = css`
  display: flex;
  flex-direction: column-reverse;
  align-items: flex-end;
  overflow: auto; /* scroll tabs when they collide */
`

const editableTabStyle = css`
  background: white;
  border-left: 0;
  border-radius: 0 10px 10px 0; /* top rounded edges */
`

type Props = {
  onDraftClick: Function
  onInputBlur: Function
  editableDraft?: string
  visible: string[]
  handleShareClick?: any // TODO
  id: string
  handleDeleteClick?: any // TODO
  drafts: Draft[]
  isBottom?: boolean
}

export default function ListDocuments({
  onDraftClick,
  handleShareClick,
  id,
  handleDeleteClick,
  onInputBlur,
  editableDraft,
  visible,
  drafts,
  isBottom = false,
}: Props) {
  let upwell = documents.get(id)
  return (
    <div
      css={css`
        ${sidewaysTabStyle}
        ${isBottom ? 'overflow: unset;' : ''}
      `}
    >
      {drafts
        .sort((a, b) => a.time - b.time)
        .map((draft: Draft, index) => {
          let visibleMaybe = visible.findIndex((id) => id === draft.id)
          const isMerged = upwell.isArchived(draft.id)
          return (
            <FileTab
              key={draft.id}
              aria-pressed={visibleMaybe > -1}
              index={index}
              isBottom={isBottom}
              isMerged={isMerged}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onDraftClick(draft)
              }}
              title={`by ${upwell.getAuthorName(
                draft.authorId
              )}, ${relativeDate(new Date(draft.time))}`}
              css={css`
                display: flex;
                flex-direction: row;
                justify-content: flex-start;
                align-items: flex-start;
                ${editableDraft === draft.id ? editableTabStyle : ''}
                box-shadow: 18px 24px 0px -18px ${upwell.getAuthorColor(
                  draft.authorId
                ) || 'none'} inset;
              `}
            >
              {/* <span css={{ color: "lightgray" }}>{draft.id.slice(0, 2)}</span> */}
              <TextareaInput
                defaultValue={draft.message}
                placeholder="draft name"
                onClick={(e) => {
                  e.stopPropagation()
                }}
                onChange={(e) => {
                  e.stopPropagation()
                }}
                onBlur={(e) => {
                  onInputBlur(e, draft)
                }}
              />
              <div>
                {!draft.shared && (
                  <EmojiButton
                    css={wiggleStyle}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (
                        // eslint-disable-next-line no-restricted-globals
                        confirm(
                          "Do you want to share your draft? it can't be unshared."
                        )
                      ) {
                        handleShareClick(draft)
                      }
                    }}
                  >
                    ↓
                  </EmojiButton>
                )}
                {!isMerged && (
                  <EmojiButton
                    css={wiggleStyle}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (
                        // eslint-disable-next-line no-restricted-globals
                        confirm(
                          "Do you want to delete this draft? you can't get it back as of yet."
                        )
                      ) {
                        handleDeleteClick(draft)
                      }
                    }}
                  >
                    🗑
                  </EmojiButton>
                )}
              </div>
            </FileTab>
          )
        })}
    </div>
  )
}
