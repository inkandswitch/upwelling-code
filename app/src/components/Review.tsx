/** @jsxImportSource @emotion/react */
import React, { useCallback, useEffect } from 'react'
import { css } from '@emotion/react/macro'
import ReactRenderer, { ReactRendererProvider } from '@atjson/renderer-react'
import * as components from './review-components'
import UpwellSource from './upwell-source'
import { Upwell, Draft } from 'api'
import { textCSS } from './Editor'
import { AuthorColorsType } from './ListDocuments'
import Documents from '../Documents'

let documents = Documents()

type ReviewState = {
  atjsonDraft?: UpwellSource
}

export function ReviewView(props: {
  upwell: Upwell
  visible: string[]
  colors?: AuthorColorsType
}) {
  const { upwell, visible } = props

  let updateAtjsonState = useCallback(
    async function () {
      if (!visible.length) {
        let atjsonDraft = new UpwellSource({
          content: '',
          annotations: [],
        })
        setState({ atjsonDraft })
        return
      }

      // FIXME these need to be ordered by dependency graph to make sense (earliest first).
      let rest = visible.map((id) => upwell.get(id))
      let editsDraft = Draft.mergeWithEdits(
        documents.author,
        upwell.rootDraft,
        ...rest
      )
      let atjsonDraft = UpwellSource.fromRaw(editsDraft)

      setState({ atjsonDraft })
    },
    [upwell, visible]
  )

  useEffect(() => {
    updateAtjsonState()
  }, [updateAtjsonState, visible])

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
