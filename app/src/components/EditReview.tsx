/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React from 'react'
import { Layer, Author } from 'api'
import { ReviewView } from './Review'
import { AuthorColorsType } from './ListDocuments'
import { Editor } from './Editor'
import Documents from '../Documents'

let documents = Documents()

// visible 0 or more layers NOT including root
// root

type Props = {
  id: string
  root: Layer
  visible: Layer[]
  onChange: any
  author: Author
  reviewMode: boolean
  colors: AuthorColorsType
}

export function EditReviewView(props: Props) {
  const { id, root, visible, onChange, reviewMode, colors, author } = props

  let upwell = documents.get(id)
  // visible.length === 0 or visible.length > 1
  let reviewView = (
    <ReviewView root={root} visible={visible} colors={colors}></ReviewView>
  )
  let component = reviewView
  if (visible.length === 1 && !upwell.isArchived(visible[0].id)) {
    let textArea = (
      <Editor
        author={author}
        colors={colors}
        onChange={onChange}
        editableLayer={visible[0]}
      ></Editor>
    )
    component = (
      <React.Fragment>{reviewMode ? reviewView : textArea}</React.Fragment>
    )
  }

  return (
    <div
      css={css`
        width: 100%;
        height: 100%;
      `}
    >
      {component}
    </div>
  )
}
