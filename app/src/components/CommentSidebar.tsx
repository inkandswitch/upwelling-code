/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import { Upwell, Comment, CommentState } from 'api'
import { AuthorColorsType } from './ListDocuments'

type CommentViewProps = {
  upwell: Upwell
  comment: Comment
  mark: { start: number; end: number }
  archiveComment: Function
  colors?: AuthorColorsType
}

export function CommentView(props: CommentViewProps) {
  let { upwell, comment, archiveComment } = props
  let authorName = upwell.getAuthorName(comment.author)

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
          onClick={() => archiveComment(comment)}
        >
          archive
        </button>
      </div>
    </div>
  )
}

type CommentSidebarProps = {
  comments: any
  marks: any
  upwell: Upwell
  colors?: AuthorColorsType
  onChange: (comment: Comment) => void
}

export default function CommentSidebar(props: CommentSidebarProps) {
  let { upwell, marks, comments, onChange, colors } = props

  let commentObjs = Object.keys(comments)
    .map((id) => {
      let comment = comments[id]

      let mark = marks.find((m: any) => m.type === 'comment' && m.value === id)

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
              colors={colors}
              upwell={upwell}
              archiveComment={onChange}
            />
          </div>
        )
      })}
    </div>
  )
}
