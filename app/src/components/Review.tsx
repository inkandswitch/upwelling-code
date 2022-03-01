/** @jsxImportSource @emotion/react */
import React, { useCallback, useEffect } from "react";
import { css } from "@emotion/react/macro";
import ReactRenderer, { ReactRendererProvider } from "@atjson/renderer-react";
import * as components from "./review-components"
import UpwellSource from "./upwell-source"
import { Layer } from "api";
import { textCSS } from './TextArea';
import Documents from '../Documents';

let documents = Documents()


type ReviewState = {
  atjsonLayer?: UpwellSource;
};

export function ReviewView(props: {id: string, visible: string[]}) {
  const { visible, id } = props;


  let updateAtjsonState = useCallback(async function () {
    let upwell = documents.get(id)
    let rootLayer = upwell.rootLayer()
    if (!visible.length) {
      let atjsonLayer = new UpwellSource({ content: rootLayer.text, annotations: [] })
      setState({ atjsonLayer })
      return
    }
    let layers = visible.map(id => upwell.get(id))
    let mergedVisible = layers.slice(1).reduce((prev: Layer, cur: Layer) => {
      prev.merge(cur)
      return prev 
    }, layers[0])
    let editsLayer = rootLayer.mergeWithEdits(mergedVisible)
    let marks = editsLayer.marks.map((m: any) => {
      let attrs = JSON.parse(m.value)
      // I wonder if there's a (good) way to preserve identity of the mark
      // here (id? presumably?) Or I guess just the mark itself?) so that we
      // can do direct actions on the Upwell layer via the atjson annotation
      // as a proxy.
      return { start: m.start, end: m.end, type: `-upwell-${m.type}`, attributes: attrs }
    })

    // generate paragraph annotations
    let pidx = 0;
    while (pidx !== -1) {
      let start = pidx;
      pidx = editsLayer.text.indexOf("\n", pidx + 1)
      let end = (pidx === -1) ? editsLayer.text.length : pidx
      marks.push({ start: start, end: end, type: "-upwell-paragraph", attributes: {}})
    }

    let atjsonLayer = new UpwellSource({content: editsLayer.text, annotations: marks});
    setState({ atjsonLayer: atjsonLayer });
  }, [id, visible])

  useEffect(() => {
    updateAtjsonState()
  }, [updateAtjsonState, visible])

  // This is not a good proxy for the correct state, but DEMO MODE.
  let [ state, setState ] = React.useState<ReviewState>({})
  if (!state.atjsonLayer) {
    updateAtjsonState()
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
