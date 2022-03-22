/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React, { useState, useEffect } from 'react'
import { Author } from 'api'
import { ReviewView } from './Review'
import { AuthorColorsType } from './ListDocuments'
import { Editor } from './Editor'
import Documents from '../Documents'

let documents = Documents()

// visible 0 or more layers NOT including root
// root

type Props = {
  id: string
  did: string
  visible: string[]
  onChange: any
  author: Author
  epoch: number
  reviewMode: boolean
  colors: AuthorColorsType
}

export function EditReviewView(props: Props) {
  const { id, did, epoch, visible, onChange, reviewMode, colors, author } =
    props
  let [text, setText] = useState<string | undefined>()
  let upwell = documents.get(id)

  useEffect(() => {
    console.log('effect triggered')
    let upwell = documents.get(id)
    let editableLayer = upwell.get(did)
    setText(editableLayer.text)
    setImmediate(() => setText(undefined))
  }, [id, did, epoch])

  if (text) return <div>{text}</div>

  // visible.length === 0 or visible.length > 1
  let reviewView = (
    <ReviewView
      upwell={upwell}
      baseLayerId={upwell.rootLayer.id}
      changeLayerIds={[did]}
      colors={colors}
    ></ReviewView>
  )
  let component = reviewView
  if (visible.length === 1) {
    let textArea = (
      <Editor
        upwell={upwell}
        author={author}
        colors={colors}
        onChange={onChange}
        editableLayerId={visible[0]}
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
