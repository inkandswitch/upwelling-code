/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React from 'react'
import { useLocation } from 'wouter'
import { nanoid } from 'nanoid'
import Documents from '../Documents'
import { Button } from './Button'

let documents = Documents()

export default function NoDocument(props: any) {
  let [, setLocation] = useLocation()
  async function newUpwell() {
    let id = nanoid()
    let doc = await documents.create(id, documents.author)
    setLocation('/' + doc.id + '/' + doc.drafts()[0].id)
  }

  return (
    <div>
      <div
        css={css`
          font-family: serif;
          display: flex;
          flex-direction: column;
          background-color: black;
          align-items: center;
          width: 100%;
          height: 100vh;
          align-self: center;
          justify-content: center;
          text-align: center;
          button {
            border: 1px solid white;
          }
        `}
      >
        <Button onClick={newUpwell}>New Document</Button>
        {props.children}
      </div>
    </div>
  )
}
