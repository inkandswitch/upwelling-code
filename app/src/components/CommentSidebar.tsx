/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React, { MouseEventHandler, useState } from 'react'
import { DraftMetadata, Comment, CommentState } from 'api'
import Documents from '../Documents'
import { Contributor } from './Contributors'
import { Button } from '@mui/material'
import TextField from '@mui/material/TextField'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'

let documents = Documents()

export type Comments = {
  [key: string]: Comment
}

type CommentViewProps = CommentThreadProps & {
  onReplyClick?: MouseEventHandler<HTMLButtonElement>
}

export function CommentView(props: CommentViewProps) {
  let { id, comment, comments, draft, level, onReplyClick } = props
  let upwell = documents.get(id)
  const [isOpen, setIsOpen] = useState(comment.state === CommentState.OPEN)

  let resolveComment = () => {
    let upwell = documents.get(id)
    let draftInstance = upwell.get(draft.id)

    setIsOpen(false)
    draftInstance.comments.resolve(comment)
    comment.children.map((cid) => draftInstance.comments.resolve(comments[cid]))
    documents.draftChanged(upwell.id, draft.id)
  }
  if (!isOpen) return null

  const showReplyButton = !comment.parentId && onReplyClick

  return (
    <CommentBox
      level={level}
      authorColor={upwell.getAuthorColor(comment.author)}
      authorName={upwell.getAuthorName(comment.author)}
      buttons={
        <>
          {' '}
          {!comment.parentId && (
            <Button color="warning" onClick={resolveComment}>
              Resolve
            </Button>
          )}
          {showReplyButton && <Button onClick={onReplyClick}>Reply</Button>}
        </>
      }
    >
      {comment.message}
    </CommentBox>
  )
}

type CommentThreadProps = {
  id: string
  draft: DraftMetadata
  comment: Comment
  mark: { start: number; end: number }
  comments: Comments
  level: number
}

const CommentThread = (props: CommentThreadProps) => {
  const { comment, comments, id, draft } = props
  const [showReply, setShowReply] = useState(false)
  const [reply, setReply] = useState('')
  const upwell = documents.get(id)

  const handleReplyClick = () => {
    setShowReply(true)
  }

  const handleReply = (e: any) => {
    e.preventDefault() // stop page reload

    const draftInstance = upwell.get(draft.id)
    draftInstance.comments.addChild(reply, documents.author.id, comment.id)
    documents.draftChanged(upwell.id, draft.id)

    setReply('')
    setShowReply(false)
  }

  return (
    <>
      <CommentView {...props} onReplyClick={handleReplyClick} />
      {comment.children?.map((cid) => (
        <CommentView
          key={`thread-${cid}`}
          {...props}
          comment={comments[cid]}
          level={1}
        />
      ))}
      {showReply && (
        <CommentBox level={1}>
          <form id="comment-area">
            <DialogContent
              css={css`
                padding-left: 0;
                padding-right: 0;
              `}
            >
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
        </CommentBox>
      )}
    </>
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

type CommentBoxProps = {
  children: any
  buttons?: any
  level: number
  authorName?: string
  authorColor?: string
}

const CommentBox = ({
  children,
  buttons,
  level,
  authorName,
  authorColor,
}: CommentBoxProps) => {
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
      {authorColor && authorName ? (
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
          <Contributor authorColor={authorColor} name={authorName} />
          <div
            css={css`
              padding: 10px 0;
            `}
          >
            {children}
          </div>
        </div>
      ) : (
        children
      )}
      {buttons && (
        <div
          css={css`
            text-align: right;
            padding-top: 5px;
          `}
        >
          {buttons}
        </div>
      )}
    </div>
  )
}
