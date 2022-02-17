/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react/macro";        
import React, { useEffect } from "react";
import { Upwell, Author, Layer } from "api";
import ReactRenderer, { ReactRendererProvider } from "@atjson/renderer-react";
import * as components from "./review-components"
import UpwellSource from "./upwell-source"

type LayerState = {
  text: string;
  title: string;
  layer?: Layer;
  atjsonLayer?: UpwellSource;
};

export function EditReviewView(props: {upwell: Upwell, state: LayerState, setState: React.Dispatch<React.SetStateAction<LayerState>>, editableLayer?: Layer}) {

  const { upwell, state, setState, editableLayer } = props;

  let [ reviewMode, setReviewMode ] = React.useState<Boolean>(true)

  if (editableLayer && state.atjsonLayer?.content != editableLayer.text) {
    setImmediate(updateAtjsonState)
  }

  async function updateAtjsonState() {
    if (editableLayer) {
      let rootLayer = await upwell.rootLayer()
      let editsLayer = await Layer.mergeWithEdits(rootLayer, editableLayer)
      let marks = editsLayer.marks.map((m: any) => {
        let attrs = JSON.parse(m.value)
        return { start: m.start, end: m.end, type: `-upwell-${m.type}`, attributes: attrs }
      })
      let atjsonLayer = new UpwellSource({content: editsLayer.text, annotations: marks});
      setState({ title: editableLayer.title, layer: editableLayer, text: editableLayer.text, atjsonLayer: atjsonLayer });
    }
  }

  function onTextChange(
    e: React.ChangeEvent<HTMLTextAreaElement>,
    key: string
  ) {
    if (editableLayer) {
      e.preventDefault();
      // @ts-ignore
      switch (e.nativeEvent.inputType) {
        case "insertText":
          editableLayer.insertAt(
            e.target.selectionEnd - 1,
            //@ts-ignore
            e.nativeEvent.data,
            key
          );
          break;
        case "deleteContentBackward":
          editableLayer.deleteAt(e.target.selectionEnd, 1, key);
          break;
        case "insertLineBreak":
          editableLayer.insertAt(e.target.selectionEnd - 1, "\n", key);
          break;
      }
      updateAtjsonState()
      upwell.persist(editableLayer);
    }
  }

  return (
        <div
          css={css`
            width: 100%;
          `}
        >
          <button css={css`margin-bottom: 1ex`} onClick={() => setReviewMode(!reviewMode)}>toggle mode</button> ({reviewMode ? 'review' : 'edit'})
          {/* <textarea className="title" value={state.title} onChange={(e) => onTextChange(e, 'title')}></textarea> */}
          { reviewMode && state.atjsonLayer && ( 
            <ReactRendererProvider value={components}>
              <article>{ReactRenderer.render(state.atjsonLayer)}</article>
            </ReactRendererProvider>
          ) }
          
          { !reviewMode && (
          <textarea
            css={css`
              width: 100%;
              height: 96%;
              border: 1px solid lightgray;
              border-width: 0 1px 1px 0;
              padding: 34px;
              resize: none;
              font-size: 16px;
              line-height: 20px;
              border-radius: 3px;

              background-image: radial-gradient(#dfdfe9 1px, #ffffff 1px);
              background-size: 20px 20px;
              background-attachment: local;

              :focus-visible {
                outline: 0;
              }
            `}
            className="text"
            value={state.text}
            onChange={(e) => onTextChange(e, "text")}
          ></textarea> )}
        </div>
  )
} 
