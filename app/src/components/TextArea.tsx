/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React, { useEffect } from 'react'
import { Layer } from 'api'
import { AuthorColorsType } from './ListDocuments'
import { HCLColor } from 'd3-color'

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
export function TextArea(props: { color?: HCLColor } | any) {
  return (
    <textarea
      css={css`
        ${textCSS}
        box-shadow: 0 10px 0 -2px ${props.color?.toString() || 'none'} inset;
        caret-color: ${props.color?.copy({ opacity: 1 }).toString() || 'auto'};
      `}
      className="text"
      value={props.state}
      onChange={(e) => props.onChange(e, 'text')}
      onPaste={(e) => props.onPaste(e)}
    ></textarea>
  )
}

type Props = {
  id: string
  editableLayer: Layer
  onChange: any
  colors?: AuthorColorsType
}

export function TextAreaView(props: Props) {
  let { editableLayer, onChange, colors = {} } = props
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

  useEffect(() => {
    editableLayer.subscribe((layer: Layer) => {
      setState(layer.text)
    })

    return () => {
      editableLayer.subscribe(() => {})
    }
  }, [editableLayer, onChange])

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

  return (
    <TextArea
      color={colors[editableLayer.author]}
      onChange={onTextChange}
      onPaste={onPaste}
      state={state}
    />
  )
}
