/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React from 'react'
import { Layer, Author } from 'api'
import { ReviewView } from './Review'
import { AuthorColorsType } from './ListDocuments'
import { EditorView } from './Editor'

// visible 0 or more layers NOT including root
// root

type Props = {
  id: string
  root?: Layer
  visible: Layer[]
  onChange: any
  author: Author
  reviewMode: boolean
  colors?: AuthorColorsType
}

export function EditReviewView(props: Props) {
  const { root, visible, onChange, reviewMode, colors } = props

  // visible.length === 0 or visible.length > 1
  let reviewView = (
    <ReviewView root={root} visible={visible} colors={colors}></ReviewView>
  )
  let component = reviewView
  if (visible.length === 1) {
    let textArea = (
      <EditorView
        colors={colors}
        onChange={onChange}
        editableLayer={visible[0]}
      ></EditorView>
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
