/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React, { useState } from 'react'
import { DraftMetadata, Comment, CommentState } from 'api'
import Documents from '../Documents'
import { Contributor } from './Contributors'
import { Button } from '@mui/material'

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
        display: flex;
        flex-direction: column;
        background-color: white;
        color: black;
        border-radius: 3px;
        padding: 10px;
      `}
    >
      <div
        css={css`
          display: flex;
          align-items: center;
          column-gap: 10px;
          align-items: baseline;
          font-size: 0.9em;
          line-height: 1.2em;
        `}
      >
        <Contributor
          authorColor={upwell.getAuthorColor(comment.author)}
          name={authorName}
        />
        <div
          css={css`
            padding: 10px 0;
          `}
        >
          {comment.message}
        </div>
      </div>
      <div
        css={css`
          text-align: right;
          padding-top: 5px;
        `}
      >
        <Button onClick={resolveComment}>Resolve</Button>
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
    <div
      css={css`  padding: 10px;
      display: flex;
      flex-direction: column;
      row-gap: 10px;
    }
      `}
    >
      {commentObjs.map(({ comment, mark }) => {
        return (
          <CommentView
            key={comment.id}
            comment={comment}
            mark={mark}
            id={id}
            draft={draft}
          />
        )
      })}
    </div>
  )
}
