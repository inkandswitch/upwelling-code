/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React, { useState, useEffect, useCallback } from 'react'
import { Upwell, Layer, Comment, CommentState } from 'api'
import { AuthorColorsType } from './ListDocuments'

type CommentViewProps = {
  upwell: Upwell
  layer: Layer
  comment: Comment
  mark: { start: number; end: number }
  colors?: AuthorColorsType
}

export function CommentView(props: CommentViewProps) {
  let { upwell, comment, mark, layer, colors } = props
  let authorName = upwell.getAuthorName(comment.author)

  let archiveComment = () => {
    layer.comments.archive(comment)
  }

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        padding: 5px;
        background-color: white;
        margin: 10px;
        color: black;
      `}
    >
      <div
        css={css`
          font-size: small;
          color: grey;
        `}
      >
        {authorName}
      </div>
      <div>{comment.message}</div>
      <div
        css={css`
          text-align: right;
          padding-top: 5px;
        `}
      >
        <button
          css={css`
            width: 5em;
            font-size: x-small;
          `}
          onClick={archiveComment}
        >
          archive
        </button>
      </div>
    </div>
  )
}

type CommentSidebarProps = {
  layer: Layer
  upwell: Upwell
  colors?: AuthorColorsType
  onChange: () => void
}

export default function CommentSidebar(props: CommentSidebarProps) {
  let { upwell, layer, colors } = props
  let comments = layer.comments.objects()

  let commentObjs = Object.keys(comments)
    .map((id) => {
      let comment = comments[id]

      let mark = layer.marks.find(
        (m: any) => m.type === 'comment' && m.value === id
      )

      return {
        comment,
        mark,
      }
    })
    .filter((cObj) => cObj.comment.state === CommentState.OPEN)

  return (
    <div>
      {commentObjs.map(({ comment, mark }) => {
        return (
          <div>
            <CommentView
              comment={comment}
              mark={mark}
              upwell={upwell}
              layer={layer}
              colors={colors}
            />
          </div>
        )
      })}
    </div>
  )
}