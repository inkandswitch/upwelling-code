import React from "react";
import ReactRenderer, { ReactRendererProvider } from "@atjson/renderer-react";
import * as components from "./review-components"
import UpwellSource from "./upwell-source"
import { Layer } from "api";

type ReviewState = {
  atjsonLayer?: UpwellSource;
};

export function ReviewView(props: {visible: Layer[], rootLayer: Layer}) {

  const { rootLayer, visible } = props;

  // This is not a good proxy for the correct state, but DEMO MODE.
  let [ state, setState ] = React.useState<ReviewState>({})
  if (!state.atjsonLayer) {
    updateAtjsonState()
    return <div>Loading...</div>
  } else {
    return (
      <ReactRendererProvider value={components}>
        <article>{ReactRenderer.render(state.atjsonLayer)}</article>
      </ReactRendererProvider>
    )
  }

  async function updateAtjsonState() {
    // TODO: mergeWithEdits on all layers
    let editsLayer = visible.reduce(Layer.mergeWithEdits, rootLayer)
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
}
