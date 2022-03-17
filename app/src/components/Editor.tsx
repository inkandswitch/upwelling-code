/** @jsxImportSource @emotion/react */
import React, { useEffect, useRef } from 'react'
import { Layer } from 'api'
import { AuthorColorsType } from './ListDocuments'

import { schema } from '../upwell-pm-schema'
import { useProseMirror, ProseMirror } from 'use-prosemirror'
import { keymap } from 'prosemirror-keymap'
import { MarkType, Slice } from 'prosemirror-model'
import { baseKeymap, Command, toggleMark } from 'prosemirror-commands'
import { history, redo, undo } from 'prosemirror-history'
import { EditorState, Transaction } from 'prosemirror-state'
import { ReplaceStep, AddMarkStep, RemoveMarkStep } from 'prosemirror-transform'

import ProsemirrorRenderer from '../ProsemirrorRenderer'
import UpwellSource from './upwell-source'
import { css } from '@emotion/react'

type Props = {
  editableLayer: Layer
  onChange: any
  colors?: AuthorColorsType
}

const toggleBold = toggleMarkCommand(schema.marks.strong)
const toggleItalic = toggleMarkCommand(schema.marks.em)

function toggleMarkCommand(mark: MarkType): Command {
  return (
    state: EditorState,
    dispatch: ((tr: Transaction) => void) | undefined
  ) => {
    return toggleMark(mark)(state, dispatch)
  }
}

export const textCSS = css`
  width: 100%;
  height: 100%;
  border: 1px solid lightgray;
  border-width: 0 1px 1px 0;
  padding: 10px 20px;
  resize: none;
  font-size: 16px;
  line-height: 20px;
  background-color: white;
  overflow: auto;

  white-space: pre-line;

  .ProseMirror {
    height: 100%;
  }
  .ProseMirror:focus-visible {
    outline: 0;
  }
`

export function EditorView(props: Props) {
  let { editableLayer, onChange, colors = {} } = props

  function getState(pmDoc: any) {
    const opts: Parameters<typeof useProseMirror>[0] = {
      schema,
      doc: pmDoc,
      plugins: [
        history(),
        keymap({
          ...baseKeymap,
          'Mod-z': undo,
          'Mod-y': redo,
          'Mod-Shift-z': redo,
          'Mod-b': toggleBold,
          'Mod-i': toggleItalic,
        }),
      ],
    }
    return opts
  }

  let atjsonLayer = UpwellSource.fromRaw(editableLayer)
  let pmDoc = ProsemirrorRenderer.render(atjsonLayer)
  const [state, setState] = useProseMirror(getState(pmDoc))

  const viewRef = useRef(null)

  useEffect(() => {
    editableLayer.subscribe((doc: Layer, local: boolean) => {
      if (local) return
      let atjsonLayer = UpwellSource.fromRaw(editableLayer)
      let pmDoc = ProsemirrorRenderer.render(atjsonLayer)
      // TODO: transform automerge to prosemirror transaction
      let transaction = state.tr.replace(
        0,
        state.doc.content.size,
        new Slice(pmDoc.content, 0, 0)
      )
      let newState = state.apply(transaction)
      setState(newState)
    })
    return () => {
      editableLayer.subscribe(() => {})
    }
  })

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
    for (let step of transaction.steps) {
      if (step instanceof ReplaceStep) {
        let from = prosemirrorToAutomerge(step.from, transaction.before)
        let to = prosemirrorToAutomerge(step.to, transaction.before)

        if (from !== to) {
          editableLayer.deleteAt(from, to - from)
        }

        if (step.slice) {
          let insOffset = from
          step.slice.content.forEach((node, idx) => {
            if (node.type.name === 'text' && node.text) {
              editableLayer.insertAt(insOffset, node.text)
              insOffset += node.text.length
            } else if (node.type.name === 'paragraph') {
              if (idx !== 0)
                // @ts-ignore
                editableLayer.insertBlock(insOffset++, node.type.name)

              let nodeText = node.textBetween(0, node.content.size)
              editableLayer.insertAt(insOffset, nodeText)
              insOffset += nodeText.length
            } else {
              alert(
                `Hi! We would love to insert that text (and other stuff), but
                this is a research prototype, and that action hasn't been
                implemented.`
              )
            }
          })
        }
      } else if (step instanceof AddMarkStep) {
        let from = prosemirrorToAutomerge(step.from, transaction.before)
        let to = prosemirrorToAutomerge(step.to, transaction.before)

        editableLayer.mark(step.mark.type.name, `(${from}..${to})`, '')
      } else if (step instanceof RemoveMarkStep) {
        // TK not implemented because automerge doesn't support removing marks yet
      }
    }

    onChange(editableLayer)
  }

  const color = colors[editableLayer.authorId]
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
