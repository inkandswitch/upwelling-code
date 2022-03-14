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

  console.log(editableLayer.marks)

  let marks = editableLayer.marks.filter((m: any) => {
    return m.type !== 'block'
  })

  console.log('b-locks', editableLayer.blocks)
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

  let pm2am = (position: number, doc: any): number => {
    let origPosition = position
    position -= 1
    let correction = 1
    for (let b of editableLayer.blocks) {
      console.log('position adjustment?', {
        orig: origPosition,
        new: position,
        blockStart: b.start,
        correction,
      })
      if (b.start === 0) continue
      if (b.start > position) break
      if (b.start < position) {
        position -= 2
        correction += 2
      }
    }
    let max = Math.min(position, doc.textContent.length)
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
      pm2am(transaction.curSelection.$anchor.pos, state.doc),
      `-->${
        editableLayer.text[
          pm2am(transaction.curSelection.$anchor.pos, state.doc)
        ]
      }<--`,
      editableLayer.text
    )
    for (let step of transaction.steps) {
      console.log(step)
      if (step instanceof ReplaceStep) {
        let from = pm2am(step.from, transaction.before)
        let to = pm2am(step.to, transaction.before)
        //@ts-ignore
        console.log('in replacestep', from, to, step.structure)
        // @ts-ignore
        if (from !== to && step.structure === false) {
          console.log(
            `DELETING AT ${from}: ${editableLayer.text.substring(from, to)}`
          )
          editableLayer.deleteAt(from, to - from)
          //@ts-ignore
        } else if (from === to && step.structure === true) {
          console.log('I THINK I SHOULD DELETE A BLOCK!', from, to)
          editableLayer.blocks
            .filter((b) => from === b.start)
            .forEach((b) => b.delete())
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
  console.log('state', state)
  console.log('viewref', viewRef)
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
