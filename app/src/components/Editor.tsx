/** @jsxImportSource @emotion/react */
import React, { useRef } from 'react'
import { Layer } from 'api'
import { AuthorColorsType } from './ListDocuments'

import { schema } from '../upwell-pm-schema'
import { useProseMirror, ProseMirror } from 'use-prosemirror'
import { keymap } from 'prosemirror-keymap'
import { baseKeymap } from 'prosemirror-commands'
import ProsemirrorRenderer from '../ProsemirrorRenderer'
import { ReplaceStep } from 'prosemirror-transform'
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
  console.log('b-locks', editableLayer.blocks)
  let marks = editableLayer.marks
  for (let b of editableLayer.blocks) {
    b.type = `-upwell-${b.type}`
    console.log(b)
    marks.push(b)
  }

  marks.map((m: any) => {
    let attrs: any = {}
    try {
      if (m.value && m.value.length > 0) attrs = JSON.parse(m.value)
    } catch {
      console.log(
        'we should really fix the thing where I stuffed mark attrs into a json string lol'
      )
    }
    if (colors) attrs['authorColor'] = colors[attrs.author]?.toString()
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

  let atjsonLayer = new UpwellSource({
    content: editableLayer.text, //.replaceAll('\n', '¶'),
    annotations: marks,
  })

  console.log(atjsonLayer)
  let pmDoc = ProsemirrorRenderer.render(atjsonLayer)
  console.log({ pmdoc: pmDoc })

  const [state, setState] = useProseMirror({
    schema,
    doc: pmDoc,
    plugins: [keymap({ ...baseKeymap })],
  })

  const viewRef = useRef(null)

  let prosemirrorToAutomerge = (position: number, doc: any): number => {
    let i = 0
    let l = editableLayer.text.length

    while (i < l) {
      i = editableLayer.text.indexOf('\uFFFC', i + 1)
      if (i >= position || i === -1) break
      position--
    }

    // we always start with a block, so we should never be inserting
    // into the document at position 0
    if (position === 0) throw new Error('this is not right')

    let max = Math.min(position, editableLayer.text.length)
    let min = Math.max(max, 0)
    return min
  }

  let dispatchHandler = (transaction: any) => {
    console.log('le transaction', transaction)
    console.log(editableLayer.text)
    console.log(
      'pm position',
      transaction.curSelection.$anchor.pos,
      'am position',
      prosemirrorToAutomerge(transaction.curSelection.$anchor.pos, state.doc),
      `-->${
        editableLayer.text[
          prosemirrorToAutomerge(
            transaction.curSelection.$anchor.pos,
            state.doc
          )
        ]
      }<--`,
      editableLayer.text
    )
    for (let step of transaction.steps) {
      console.log(step)
      if (step instanceof ReplaceStep) {
        let from = prosemirrorToAutomerge(step.from, transaction.before)
        let to = prosemirrorToAutomerge(step.to, transaction.before)
        //@ts-ignore
        console.log('in replacestep', from, to, step.structure)
        // @ts-ignore
        if (from !== to) {
          console.log(
            `DELETING AT ${from}: ${editableLayer.text.substring(from, to)}`
          )
          editableLayer.deleteAt(from, to - from)
          //@ts-ignore
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
            // @ts-ignore
            if (step.slice.content.content.length === 2 && from === to) {
              console.log(
                //@ts-ignore
                step.slice.content.content,
                'have marks',
                editableLayer.marks,
                'want to insert new paragraph at ',
                from
              )
              editableLayer.insertBlock(from, 'paragraph')
            }
          }
        }
      }
    }

    onChange(editableLayer)

    let newState = state.apply(transaction)
    setState(newState)
  }

  const color = colors[editableLayer.author]
  // this is a hack because the use-prosemirror lib isn't passing any styling on
  // to the prosemirror parent div, and there's a bug that prevents input when
  // the div is either empty or unstyled. there's probably a more elegant way to
  // fix this, but this works for now.
  //@ts-ignore
  setTimeout(
    () => (viewRef.current.view.dom.style.border = '1px solid white'),
    1000
  )
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
