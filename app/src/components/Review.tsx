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
  baseLayerId: string
  changeLayerIds: string[]
  colors?: AuthorColorsType
}) {
  const { upwell, baseLayerId, changeLayerIds, colors } = props

  let updateAtjsonState = useCallback(
    async function () {
      let baseLayer = upwell.get(baseLayerId)
      let changeLayers = changeLayerIds.map((id) => upwell.get(id))

      let editsLayer = Layer.mergeWithEdits(
        documents.author,
        baseLayer,
        ...changeLayers
      )
      let atjsonLayer = UpwellSource.fromRaw(editsLayer, colors)
      console.log(atjsonLayer)

      setState({ atjsonLayer })
    },
    [upwell, baseLayerId, changeLayerIds, colors]
  )

  useEffect(() => {
    updateAtjsonState()
  }, [updateAtjsonState, baseLayerId, changeLayerIds])

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
