/** @jsxImportSource @emotion/react */
import React, { useCallback, useEffect } from 'react'
import { css } from '@emotion/react/macro'
import ReactRenderer, { ReactRendererProvider } from '@atjson/renderer-react'
import * as components from './review-components'
import UpwellSource from './upwell-source'
import { Upwell, Draft } from 'api'
import { editorSharedCSS, textCSS } from './Editor'
import Documents from '../Documents'

let documents = Documents()

type ReviewState = {
  atjsonDraft?: UpwellSource
}

export function ReviewView(props: {
  upwell: Upwell
  heads: string[]
  changeDraftIds: string[]
}) {
  const { upwell, heads, changeDraftIds } = props

  let updateAtjsonState = useCallback(
    async function () {
      let baseDraft = upwell.rootDraft.checkout(heads)
      let changeDrafts = changeDraftIds.map((id) => upwell.get(id))

      let { draft, attribution } = Draft.mergeWithEdits(
        documents.author,
        baseDraft,
        ...changeDrafts
      )

      for (let i = 0; i < attribution.length; i++) {
        let edits = attribution[i]

        edits.add.forEach((edit) => {
          let text = draft.text.substring(edit.start, edit.end)
          console.log(edit)
          draft.mark(
            'insert',
            `(${edit.start}..${edit.end})`,
            JSON.stringify({
              author: edit.actor,
              text,
            })
          )
        })

        edits.del.forEach((edit) => {
          draft.mark(
            'delete',
            `(${edit.pos}..${edit.pos})`,
            JSON.stringify({
              author: edit.actor,
              text: edit.val,
            })
          )
        })
      }

      let atjsonDraft = UpwellSource.fromRaw(draft, upwell)
      setState({ atjsonDraft })
    },
    [upwell, heads, changeDraftIds]
  )

  useEffect(() => {
    updateAtjsonState()
  }, [updateAtjsonState, heads, changeDraftIds])

  // This is not a good proxy for the correct state, but DEMO MODE.
  let [state, setState] = React.useState<ReviewState>({})
  if (!state.atjsonDraft) {
    return <div>Loading...</div>
  } else {
    return (
      <ReactRendererProvider value={components}>
        <article
          css={css`
            ${editorSharedCSS}
            ${textCSS}
            cursor: not-allowed;
          `}
        >
          {ReactRenderer.render(state.atjsonDraft)}
        </article>
      </ReactRendererProvider>
    )
  }
}
