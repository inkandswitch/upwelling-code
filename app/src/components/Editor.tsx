/** @jsxImportSource @emotion/react */
//import React, { useEffect, useRef, useState } from 'react'
import React, { useState, useRef } from 'react'
import { Upwell, Layer, Author } from 'api'
import { AuthorColorsType } from './ListDocuments'
//import Documents from '../Documents'

import { schema } from '../upwell-pm-schema'
import { ProseMirror } from 'use-prosemirror'
import { keymap } from 'prosemirror-keymap'
//import { MarkType, Slice } from 'prosemirror-model'
import { MarkType } from 'prosemirror-model'
import { baseKeymap, Command, toggleMark } from 'prosemirror-commands'
import { history, redo, undo } from 'prosemirror-history'
import { EditorState, Transaction } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { ReplaceStep, AddMarkStep, RemoveMarkStep } from 'prosemirror-transform'
import { contextMenu } from '../prosemirror/ContextMenuPlugin'

import ProsemirrorRenderer from '../ProsemirrorRenderer'
import UpwellSource from './upwell-source'
import { css } from '@emotion/react'

type Props = {
  upwell: Upwell
  editableLayerId: string
  author: Author
  onChange: any
  colors: AuthorColorsType
}

//let documents = Documents()

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

let prosemirrorToAutomergeNumber = (position: number, layer: Layer): number => {
  let i = 0
  let l = layer.text.length

  while (i < l) {
    i = layer.text.indexOf('\uFFFC', i + 1)
    if (i >= position || i === -1) break
    position--
  }

  // we always start with a block, so we should never be inserting
  // into the document at position 0
  if (position === 0) throw new Error('this is not right')

  let max = Math.min(position, layer.text.length)
  let min = Math.max(max, 0)
  return min
}

let prosemirrorToAutomerge = (
  position: { from: number; to: number },
  layer: Layer
): { from: number; to: number } => {
  return {
    from: prosemirrorToAutomergeNumber(position.from, layer),
    to: prosemirrorToAutomergeNumber(position.to, layer),
  }
}

export function Editor(props: Props) {
  let { upwell, editableLayerId, onChange, author, colors } = props

  function getState(pmDoc: any) {
    return EditorState.create({
      schema,
      doc: pmDoc,
      plugins: [
        contextMenu([
          {
            view: () => {
              let commentButton = document.createElement('button')
              commentButton.innerText = '💬'
              return commentButton
            },

            handleClick: (
              e: any,
              view: EditorView,
              contextMenu: HTMLDivElement,
              buttonEl: HTMLButtonElement
            ) => {
              let editableLayer = upwell.get(editableLayerId)
              let { from, to } = prosemirrorToAutomerge(
                view.state.selection,
                editableLayer
              )
              let message = prompt('what is your comment')
              editableLayer.insertComment(from, to, message!, author.id)
              contextMenu.style.display = 'none'
              onChange()
            },
          },
        ]),
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
    })
  }

  let editableLayer = upwell.get(editableLayerId)
  let atjsonLayer = UpwellSource.fromRaw(editableLayer, colors)
  let pmDoc = ProsemirrorRenderer.render(atjsonLayer)
  const [state, setState] = useState<EditorState>(getState(pmDoc))
  //const [heads, setHeads] = useState<string[]>(editableLayer.doc.getHeads())

  const viewRef = useRef(null)

  /*
   * this was breaking things badly in strange ways, so just commenting out for the moment.
   *
  useEffect(() => {
    editableLayer.subscribe((doc: Layer) => {
      let change: any = doc.getChanges(heads)
      if (change.length) {
        let [authorId] = change[0].actor.split('0000')
        if (authorId === documents.author.id) return
      }

      let atjsonLayer = UpwellSource.fromRaw(doc)
      let pmDoc = ProsemirrorRenderer.render(atjsonLayer)

      let { selection } = state

      // TODO: transform automerge to prosemirror transaction
      let transaction = state.tr
        .replace(0, state.doc.content.size, new Slice(pmDoc.content, 0, 0))
        .setSelection(selection)
      let newState = state.apply(transaction)
      setState(newState)
      setHeads(doc.doc.getHeads())
    })
    return () => {
      editableLayer.subscribe(() => {})
    }
  })
  */

  let dispatchHandler = (transaction: any) => {
    for (let step of transaction.steps) {
      if (step instanceof ReplaceStep) {
        let { from, to } = prosemirrorToAutomerge(step, editableLayer)

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
        let { from, to } = prosemirrorToAutomerge(step, editableLayer)

        editableLayer.mark(step.mark.type.name, `(${from}..${to})`, '')
      } else if (step instanceof RemoveMarkStep) {
        // TK not implemented because automerge doesn't support removing marks yet
      }
    }

    onChange(editableLayer)
    let newState = state.apply(transaction)
    setState(newState)
  }

  let color = colors[editableLayer.authorId]
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
