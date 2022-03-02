/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React from 'react'
import { Layer } from 'api'

export const textCSS = css`
  width: 100%;
  height: 100%;
  border: 1px solid lightgray;
  border-width: 0 1px 1px 0;
  padding: 34px;
  resize: none;
  font-size: 16px;
  line-height: 20px;
  border-radius: 3px;
  background-color: white;
  overflow: auto;

  white-space: pre-line;

  :focus-visible {
    outline: 0;
  }
`
export function TextArea(props: any) {
  return (
    <textarea
      css={textCSS}
      className="text"
      value={props.state}
      onChange={(e) => props.onChange(e, 'text')}
      onPaste={(e) => props.onPaste(e)}
    ></textarea>
  )
}

type Props = {
  editableLayer: Layer
  onChange: any
}

export function TextAreaView(props: Props) {
  let { editableLayer, onChange } = props
  let [state, setState] = React.useState<string>(editableLayer.text || '')

  function onTextChange(
    e: React.ChangeEvent<HTMLTextAreaElement>,
    key: string
  ) {
    if (!editableLayer) return console.error('Layer not editable.')
    // @ts-ignore
    switch (e.nativeEvent.inputType) {
      case 'insertText':
        editableLayer.insertAt(
          e.target.selectionEnd - 1,
          //@ts-ignore
          e.nativeEvent.data,
          key
        )
        break
      case 'deleteContentBackward':
        editableLayer.deleteAt(e.target.selectionEnd, 1, key)
        break
      case 'deleteContentForward':
        editableLayer.deleteAt(e.target.selectionEnd, 1, key)
        break
      case 'insertLineBreak':
        editableLayer.insertAt(e.target.selectionEnd - 1, '\n', key)
        break
    }
    setState(editableLayer.text)
    onChange(editableLayer)
  }

  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    if (!editableLayer) return console.error('Layer not editable.')
    editableLayer.insertAt(
      //@ts-ignore
      e.target.selectionEnd,
      e.clipboardData.getData('text/plain')
    )
    setState(editableLayer.text)
    onChange(editableLayer)
  }

  return <TextArea onChange={onTextChange} onPaste={onPaste} state={state} />
}
