/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React, { useState } from 'react'
import { DraftMetadata, Comment, CommentState } from 'api'
import Documents from '../Documents'
import { Contributor } from './Contributors'
import { Button } from '@mui/material'
import TextField from '@mui/material/TextField'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'

let documents = Documents()

type Comments = {
  [key: string]: Comment
}

type CommentViewProps = {
  id: string
  draft: DraftMetadata
  comment: Comment
  mark: { start: number; end: number }
  comments: Comments
  level: number
}

export function CommentView(props: CommentViewProps) {
  let { id, comment, draft, level } = props
  let upwell = documents.get(id)
  let authorName = upwell.getAuthorName(comment.author)
  const [isOpen, setIsOpen] = useState(comment.state === CommentState.OPEN)
  const [showReply, setShowReply] = useState(false)
  const [reply, setReply] = useState('')

  let resolveComment = () => {
    let upwell = documents.get(id)
    let draftInstance = upwell.get(draft.id)
    draftInstance.comments.resolve(comment)
    documents.draftChanged(upwell.id, draft.id)
    setIsOpen(false)
  }
  if (!isOpen) return null

  const handleReply = (e: any) => {
    e.preventDefault() // stop page reload

    const upwell = documents.get(id)
    const draftInstance = upwell.get(draft.id)
    draftInstance.comments.addChild(
      reply,
      documents.author.id,
      props.comment.id
    )
    documents.draftChanged(upwell.id, draft.id)

    setReply('')
    setShowReply(false)
  }

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        background-color: white;
        color: black;
        border-radius: 3px;
        padding: 10px;
        margin-left: ${20 * level}px;
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
        <Button color="warning" onClick={resolveComment}>
          Resolve
        </Button>
        <Button onClick={() => setShowReply(true)}>Reply</Button>
      </div>
      {showReply && (
        <form id="comment-area">
          <DialogContent>
            <TextField
              autoFocus
              id="comment-input"
              label="Comment"
              type="textarea"
              fullWidth
              variant="standard"
              onChange={(e) => setReply(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button
              variant="outlined"
              color="error"
              onClick={() => setShowReply(false)}
            >
              Cancel
            </Button>
            <Button variant="outlined" onClick={handleReply} type="submit">
              Reply
            </Button>
          </DialogActions>
        </form>
      )}
    </div>
  )
}

const CommentThread = (props: CommentViewProps) => (
  <>
    <CommentView {...props} />
    {props.comment.children?.map((cid) => (
      <CommentThread
        key={`thread-${cid}`}
        {...props}
        comment={props.comments[cid]}
        level={props.level + 1}
      />
    ))}
  </>
)

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
    .filter(
      (cObj) =>
        cObj.comment.state === CommentState.OPEN && !cObj.comment.parentId
    )

  return (
    <div
      css={css`
        padding: 10px;
        display: flex;
        flex-direction: column;
        row-gap: 4px;
      `}
    >
      {commentObjs.map(({ comment, mark }) => {
        return (
          <CommentThread
            key={comment.id}
            comment={comment}
            comments={comments}
            mark={mark}
            id={id}
            draft={draft}
            level={0}
          />
        )
      })}
    </div>
  )
}
