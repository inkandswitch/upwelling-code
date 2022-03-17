/** @jsxImportSource @emotion/react */
import React, { useCallback, useEffect } from 'react'
import { css } from '@emotion/react/macro'
import ReactRenderer, { ReactRendererProvider } from '@atjson/renderer-react'
import * as components from './review-components'
import UpwellSource from './upwell-source'
import { Upwell, Layer } from 'api'
import { textCSS } from './Editor'
import { AuthorColorsType } from './ListDocuments'
import Documents from '../Documents'

let documents = Documents()

type ReviewState = {
  atjsonLayer?: UpwellSource
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
        let atjsonLayer = new UpwellSource({
          content: '',
          annotations: [],
        })
        setState({ atjsonLayer })
        return
      }

      // FIXME these need to be ordered by dependency graph to make sense (earliest first).
      let rest = visible.map((id) => upwell.get(id))
      let editsLayer = Layer.mergeWithEdits(
        documents.author,
        upwell.rootLayer,
        ...rest
      )
      let atjsonLayer = UpwellSource.fromRaw(editsLayer)

      setState({ atjsonLayer })
    },
    [upwell, visible]
  )

  useEffect(() => {
    updateAtjsonState()
  }, [updateAtjsonState, visible])

  // This is not a good proxy for the correct state, but DEMO MODE.
  let [state, setState] = React.useState<ReviewState>({})
  if (!state.atjsonLayer) {
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
          {ReactRenderer.render(state.atjsonLayer)}
        </article>
      </ReactRendererProvider>
    )
  }
}
