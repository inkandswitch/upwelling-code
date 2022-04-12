/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React, { useState } from 'react'
import { DraftMetadata, Comment, CommentState } from 'api'
import Documents from '../Documents'

let documents = Documents()

type CommentViewProps = {
  id: string
  draft: DraftMetadata
  comment: Comment
  mark: { start: number; end: number }
}

export function CommentView(props: CommentViewProps) {
  let { id, comment, draft } = props
  let upwell = documents.get(id)
  let authorName = upwell.getAuthorName(comment.author)
  let [state, setState] = useState({
    resolved: comment.state !== CommentState.OPEN,
  })

  let resolveComment = () => {
    let upwell = documents.get(id)
    let draftInstance = upwell.get(draft.id)
    draftInstance.comments.resolve(comment)
    documents.draftChanged(upwell.id, draft.id)
    setState({ resolved: true })
  }
  if (state.resolved) return <div></div>

  return (
    <div
      css={css`
        width: 15vw;
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
          color: ${upwell.getAuthorColor(comment.author)};
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
          onClick={resolveComment}
        >
          resolve
        </button>
      </div>
    </div>
  )
}

type CommentSidebarProps = {
  draft: DraftMetadata
  id: string
}

export default function CommentSidebar(props: CommentSidebarProps) {
  let { id, draft } = props
  let upwell = documents.get(id)
  let draftInstance = upwell.get(draft.id)
  let comments = draftInstance.comments.objects()

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
              key={comment.id}
              comment={comment}
              mark={mark}
              id={id}
              draft={draft}
            />
          </div>
        )
      })}
    </div>
  )
}
