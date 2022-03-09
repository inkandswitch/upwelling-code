/** @jsxImportSource @emotion/react */
import React, { useRef } from 'react'
import { Layer } from 'api'
import { AuthorColorsType } from './ListDocuments'

import { schema } from '../upwell-pm-schema'
import { useProseMirror, ProseMirror } from 'use-prosemirror'
import { keymap } from 'prosemirror-keymap'
import { baseKeymap } from 'prosemirror-commands'
import ProsemirrorRenderer from '../ProsemirrorRenderer'
import { ReplaceStep, AddMarkStep, RemoveMarkStep } from 'prosemirror-transform'
import UpwellSource from './upwell-source'
import { css } from '@emotion/react'

type Props = {
  editableLayer: Layer
  onChange: any
  colors?: AuthorColorsType
}

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

export function EditorView(props: Props) {
  let { editableLayer, onChange, colors = {} } = props

  let marks = editableLayer.marks.map((m: any) => {
    let attrs = JSON.parse(m.value)
    if (colors) attrs['authorColor'] = colors[attrs.author].toString()
    // I wonder if there's a (good) way to preserve identity of the mark
    // here (id? presumably?) Or I guess just the mark itself?) so that we
    // can do direct actions on the Upwell layer via the atjson annotation
    // as a proxy.
    return {
      start: m.start,
      end: m.end,
      type: `-upwell-${m.type}`,
      attributes: attrs,
    }
  })

  // generate paragraph annotations
  let pidx = 0
  while (pidx !== -1) {
    let start = pidx
    pidx = editableLayer.text.indexOf('\n', pidx + 1)
    let end = pidx === -1 ? editableLayer.text.length : pidx + 1
    marks.push({
      start: start,
      end: end,
      type: '-upwell-paragraph',
      attributes: {},
    })
    if (pidx !== -1) pidx++
  }

  let atjsonLayer = new UpwellSource({
    content: editableLayer.text.replaceAll('\n', '¶'),
    annotations: marks,
  })

  let pmDoc = ProsemirrorRenderer.render(atjsonLayer)

  const [state, setState] = useProseMirror({
    schema,
    doc: pmDoc,
    plugins: [keymap({ ...baseKeymap })],
  })

  const viewRef = useRef(null)

  let pm2am = (position: number, doc: any): number => {
    let max = Math.min(position - 1, doc.textContent.length)
    let min = Math.max(max, 0)
    return min
  }

  let dispatchHandler = (transaction: any) => {
    for (let step of transaction.steps) {
      console.log(step)
      if (step instanceof ReplaceStep) {
        let from = pm2am(step.from, transaction.before)
        let to = pm2am(step.to, transaction.before)
        if (from !== to) {
          console.log(
            `DELETING AT ${from}: ${editableLayer.text.substring(from, to)}`
          )
          editableLayer.deleteAt(from, to - from)
        }
        if (step.slice) {
          // @ts-ignore
          if (step.structure === false) {
            // insertion
            const insertedContent = step.slice.content.textBetween(
              0,
              step.slice.content.size
            )
            console.log(`INSERTING AT ${from}: ${insertedContent}`)
            editableLayer.insertAt(from, insertedContent)
          } else {
            // STRUCTURE CHANGE. PROSEMIRROR'S API HERE IS LE GARBAGE
            // DELETE THIS COMMENT BEFORE IT GOES PUBLIC
            // @ts-ignore
            if (step.slice.content.content.length === 2) {
              editableLayer.insertAt(from, '\n')
            }
          }
        }
      }
    }

    let newState = state.apply(transaction)
    setState(newState)
    onChange(editableLayer)
  }

  const color = colors[editableLayer.author]
  return (
    <ProseMirror
      state={state}
      ref={viewRef}
      dispatchTransaction={dispatchHandler}
      css={css`
        ${textCSS}
        box-shadow: 0 10px 0 -2px ${color?.toString() || 'none'} inset;
        caret-color: ${color?.copy({ opacity: 1 }).toString() || 'auto'};
      `}
    />
  )
}
