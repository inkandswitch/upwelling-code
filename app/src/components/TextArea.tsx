/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react/macro";        
import React from "react";
import { Layer } from "api";

function TextArea(props: any) {
  return <textarea
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
      value={props.state}
      onChange={(e) => props.onChange(e, "text")}
    ></textarea> 
}


type Props = {
  editableLayer: Layer,
  onChange: any
}

export function TextAreaView(props: Props) {
  let { editableLayer, onChange } = props
  let [ state, setState ] = React.useState<string>(editableLayer.text || '')

  function onTextChange(
    e: React.ChangeEvent<HTMLTextAreaElement>,
    key: string
  ) {
    if (!editableLayer) return console.error('Layer not editable.')
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
      onChange(editableLayer)
  }

  return <TextArea onChange={onTextChange} state={state} />
}
