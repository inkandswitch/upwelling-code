/** @jsxImportSource @emotion/react */
import React, { useCallback, useEffect } from 'react'
import { css } from '@emotion/react/macro'
import ReactRenderer, { ReactRendererProvider } from '@atjson/renderer-react'
import * as components from './review-components'
import UpwellSource from './upwell-source'
import { Upwell, Draft } from 'api'
import { textCSS } from './Editor'
import Documents from '../Documents'

let documents = Documents()

type ReviewState = {
  atjsonDraft?: UpwellSource
}

export function ReviewView(props: {
  upwell: Upwell
  baseDraftId: string
  changeDraftIds: string[]
}) {
  const { upwell, baseDraftId, changeDraftIds } = props

  let updateAtjsonState = useCallback(
    async function () {
      let baseDraft = upwell.get(baseDraftId)
      let changeDrafts = changeDraftIds.map((id) => upwell.get(id))

      let editsDraft = Draft.mergeWithEdits(
        documents.author,
        baseDraft,
        ...changeDrafts
      )
      let atjsonDraft = UpwellSource.fromRaw(editsDraft)
      setState({ atjsonDraft })
    },
    [upwell, baseDraftId, changeDraftIds]
  )

  useEffect(() => {
    updateAtjsonState()
  }, [updateAtjsonState, baseDraftId, changeDraftIds])

  // This is not a good proxy for the correct state, but DEMO MODE.
  let [state, setState] = React.useState<ReviewState>({})
  if (!state.atjsonDraft) {
    return <div>Loading...</div>
  } else {
    return (
      <ReactRendererProvider value={components}>
        <article
          css={css`
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
