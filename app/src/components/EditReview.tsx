/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React, { useState, useEffect } from 'react'
import { Author } from 'api'
import { ReviewView } from './Review'
import { Editor } from './Editor'
import Documents from '../Documents'

let documents = Documents()

// visible 0 or more drafts NOT including root
// root

type Props = {
  id: string
  did: string
  visible: string[]
  onChange: any
  historyDraftId: string
  author: Author
  epoch: number
  reviewMode: boolean
}

export function EditReviewView(props: Props) {
  const {
    id,
    did,
    historyDraftId,
    epoch,
    visible,
    onChange,
    reviewMode,
    author,
  } = props
  let [text, setText] = useState<string | undefined>()
  let upwell = documents.get(id)

  useEffect(() => {
    let upwell = documents.get(id)
    let editableDraft = upwell.get(did)
    setText(editableDraft.text)
    setImmediate(() => setText(undefined))
  }, [id, did, epoch])

  if (text) return <div>{text}</div>

  // visible.length === 0 or visible.length > 1
  let reviewView = (
    <ReviewView
      upwell={upwell}
      baseDraftId={historyDraftId}
      changeDraftIds={[did]}
    ></ReviewView>
  )
  let component = reviewView
  if (visible.length === 1) {
    let textArea = (
      <Editor
        upwell={upwell}
        author={author}
        onChange={onChange}
        baseDraftId={historyDraftId}
        editableDraftId={visible[0]}
      ></Editor>
    )
    component = (
      <React.Fragment>{reviewMode ? reviewView : textArea}</React.Fragment>
    )
  }

  return (
    <div
      css={css`
        background-color: white;
        width: 100%;
        height: 100%;
      `}
    >
      {component}
    </div>
  )
}
