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
      console.log(baseDraft.text, baseDraft.message)
      console.log(changeDrafts[0].text, changeDrafts[0].message)

      let editsDraft = Draft.mergeWithEdits(
        documents.author,
        baseDraft,
        ...changeDrafts
      )
      let atjsonDraft = UpwellSource.fromRaw(editsDraft)
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
