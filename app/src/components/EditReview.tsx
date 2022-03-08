/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React from 'react'
import { Author } from 'api'
import { ReviewView } from './Review'
import { TextAreaView } from './TextArea'
import Documents from '../Documents'
import { AuthorColorsType } from './ListDocuments'

let documents = Documents()

// visible 0 or more layers NOT including root
// root

type Props = {
  id: string
  visible: string[]
  onChange: any
  author: Author
  reviewMode: boolean
  colors?: AuthorColorsType
}

export function EditReviewView(props: Props) {
  const { id, visible, onChange, reviewMode, colors } = props
  console.log('rendering EditReviewView')
  let upwell = documents.get(id)
  let root = upwell.rootLayer
  if (!root) {
    console.log('no root')
    return <div></div>
  }

  // visible.length === 0 or visible.length > 1
  let reviewView = (
    <ReviewView id={id} visible={visible} colors={colors}></ReviewView>
  )
  let component = reviewView
  if (visible.length === 1) {
    let layer = upwell.get(visible[0])
      let textArea = (
        <TextAreaView
          colors={colors}
          onChange={onChange}
          editableLayer={layer}
        ></TextAreaView>
      )
      component = (
        <React.Fragment>
          {reviewMode ? reviewView : textArea}
        </React.Fragment>
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
