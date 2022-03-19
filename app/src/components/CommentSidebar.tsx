/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React, { useState } from 'react'
import { Upwell, LayerMetadata, Comment, CommentState } from 'api'
import { AuthorColorsType } from './ListDocuments'
import Documents from '../Documents'

let documents = Documents()

type CommentViewProps = {
  upwell: Upwell
  layer: LayerMetadata
  comment: Comment
  mark: { start: number; end: number }
  colors?: AuthorColorsType
}

export function CommentView(props: CommentViewProps) {
  let { upwell, comment, layer } = props
  let authorName = upwell.getAuthorName(comment.author)
  let [state, setState] = useState({
    archived: comment.state !== CommentState.OPEN,
  })

  let archiveComment = () => {
    let draft = upwell.get(layer.id)
    draft.comments.archive(comment)
    documents.save(upwell.id)
    setState({ archived: true })
  }
  if (state.archived) return <div></div>

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
  layer: LayerMetadata
  upwell: Upwell
  colors?: AuthorColorsType
  onChange: () => void
}

export default function CommentSidebar(props: CommentSidebarProps) {
  let { upwell, layer, colors } = props
  let draft = upwell.get(layer.id)
  let comments = draft.comments.objects()

  let commentObjs = Object.keys(comments)
    .map((id) => {
      let comment = comments[id]

      let mark = draft.marks.find(
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
