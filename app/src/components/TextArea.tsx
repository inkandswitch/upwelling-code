/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react/macro";        
import React, { useEffect } from "react";
import { Upwell, Author, Layer } from "api";

export function TextAreaView(props: {upwell: Upwell, editableLayer: Layer}) {

  const { upwell, editableLayer } = props;

  let [ state, setState ] = React.useState<string>(editableLayer.text)

  function onTextChange(
    e: React.ChangeEvent<HTMLTextAreaElement>,
    key: string
  ) {
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
      setState(editableLayer.text)
      upwell.persist(editableLayer);
  }

  return (
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
            value={state}
            onChange={(e) => onTextChange(e, "text")}
          ></textarea> 
        )
}
