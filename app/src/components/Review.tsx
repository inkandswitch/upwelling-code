import React, { useEffect } from "react";
import ReactRenderer, { ReactRendererProvider } from "@atjson/renderer-react";
import * as components from "./review-components"
import UpwellSource from "./upwell-source"
import { Upwell, Author, Layer } from "api";

type ReviewState = {
  atjsonLayer: UpwellSource;
};

export function ReviewView(props: {upwell: Upwell, editableLayer: Layer}) {

  const { upwell, editableLayer } = props;

  let initialSource: UpwellSource = new UpwellSource({content: 'loading...', annotations: []});

  let [ state, setState ] = React.useState<ReviewState>({atjsonLayer: initialSource});

  // This is not a good proxy for the correct state, but DEMO MODE.
  setImmediate(updateAtjsonState)

  async function updateAtjsonState() {
    let rootLayer = await upwell.rootLayer()
    let editsLayer = await Layer.mergeWithEdits(rootLayer, editableLayer)
    let marks = editsLayer.marks.map((m: any) => {
      let attrs = JSON.parse(m.value)
      // I wonder if there's a (good) way to preserve identity of the mark
      // here (id? presumably?) Or I guess just the mark itself?) so that we
      // can do direct actions on the Upwell layer via the atjson annotation
      // as a proxy.
      return { start: m.start, end: m.end, type: `-upwell-${m.type}`, attributes: attrs }
    })
    let atjsonLayer = new UpwellSource({content: editsLayer.text, annotations: marks});
    setState({ atjsonLayer: atjsonLayer });
  }

  return (
    <ReactRendererProvider value={components}>
      <article>{ReactRenderer.render(state.atjsonLayer)}</article>
    </ReactRendererProvider>
  )
}
