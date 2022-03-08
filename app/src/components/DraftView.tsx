/** @jsxImportSource @emotion/react */
import { css, Interpolation, Theme } from '@emotion/react/macro'
import React from 'react'
import { Author } from 'api'
import { EditReviewView } from './EditReview'

type DraftViewProps = {
  id: string
  did: string
  author: Author
}

export default function DraftView(props: DraftViewProps) {
  const { id, did, author } = props

  let visible = [did]

  function onChange() {
    console.log('boop')
  }

  console.log('visible')
  return (
    <EditReviewView
      visible={visible}
      id={id}
      author={author}
      onChange={onChange}
    />
  )
}
