/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React from 'react'
import { Layer, Author } from 'api'
import { ReviewView } from './Review'
import { TextAreaView } from './TextArea'
import { AuthorColorsType } from './ListDocuments'

// visible 0 or more layers NOT including root
// root

type Props = {
  id: string
  root: Layer
  visible: Layer[]
  onChange: any
  author: Author
  reviewMode: boolean
  colors?: AuthorColorsType
}

export function EditReviewView(props: Props) {
  const { id, root, visible, onChange, reviewMode, colors } = props
  console.log('rendering EditReviewView')
  if (!root) {
    console.log('no root')
    return <div></div>
  }

  // visible.length === 0 or visible.length > 1
  let reviewView = (
    <ReviewView root={root} visible={visible} colors={colors}></ReviewView>
  )
  let component = reviewView
  if (visible.length === 1) {
    let textArea = (
      <TextAreaView
        id={id}
        colors={colors}
        onChange={onChange}
        editableLayer={visible[0]}
      ></TextAreaView>
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
