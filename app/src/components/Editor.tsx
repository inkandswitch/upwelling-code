/** @jsxImportSource @emotion/react */
import React, { useEffect, useState, useRef } from 'react'
import { Transaction as UpwellTransaction, Upwell, Draft, Author } from 'api'
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
import Documents from '../Documents'

let documents = Documents()

type Props = {
  upwell: Upwell
  editableDraftId: string
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

let prosemirrorToAutomergeNumber = (position: number, draft: Draft): number => {
  let i = 0
  let l = draft.text.length

  while (i < l) {
    i = draft.text.indexOf('\uFFFC', i + 1)
    if (i >= position || i === -1) break
    position--
  }

  // we always start with a block, so we should never be inserting
  // into the document at position 0
  if (position === 0) throw new Error('this is not right')

  let max = Math.min(position, draft.text.length)
  let min = Math.max(max, 0)
  return min
}

let prosemirrorToAutomerge = (
  position: { from: number; to: number },
  draft: Draft
): { from: number; to: number } => {
  return {
    from: prosemirrorToAutomergeNumber(position.from, draft),
    to: prosemirrorToAutomergeNumber(position.to, draft),
  }
}

export function Editor(props: Props) {
  let { upwell, editableDraftId, onChange, author, colors } = props

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
              let editableDraft = upwell.get(editableDraftId)
              let { from, to } = prosemirrorToAutomerge(
                view.state.selection,
                editableDraft
              )
              let message = prompt('what is your comment')
              editableDraft.insertComment(from, to, message!, author.id)
              documents.save(upwell.id)
              contextMenu.style.display = 'none'
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

  let editableDraft = upwell.get(editableDraftId)
  let atjsonDraft = UpwellSource.fromRaw(editableDraft, colors)
  let pmDoc = ProsemirrorRenderer.render(atjsonDraft)
  const [state, setState] = useState<EditorState>(getState(pmDoc))
  //const [heads, setHeads] = useState<string[]>(editableDraft.doc.getHeads())

  const viewRef = useRef(null)

  useEffect(() => {
    if (documents.rtc && documents.rtc.draft.id === editableDraftId) {
      documents.rtc.transactions.subscribe((transaction: UpwellTransaction) => {
        console.log('from', transaction.author)
        if (transaction.changes) {
          for (const changeset of transaction.changes) {
            console.log(changeset)
            // TODO: transform automerge to prosemirror transaction
          }
        }
        if (transaction.cursor) {
          // TODO: update cursor position
        }

        /*
        let atjsonLayer = UpwellSource.fromRaw(doc)
        let pmDoc = ProsemirrorRenderer.render(atjsonLayer)

        let transaction = state.tr
          .replace(0, state.doc.content.size, new Slice(pmDoc.content, 0, 0))
          .setSelection(selection)
        let newState = state.apply(transaction)
        setState(newState)
        */
      })
    }
    return () => {
      documents.rtc?.transactions.unsubscribe()
    }
  })

  let dispatchHandler = (transaction: any) => {
    for (let step of transaction.steps) {
      if (step instanceof ReplaceStep) {
        let { from, to } = prosemirrorToAutomerge(step, editableDraft)

        if (from !== to) {
          editableDraft.deleteAt(from, to - from)
        }

        if (step.slice) {
          let insOffset = from
          step.slice.content.forEach((node, idx) => {
            if (node.type.name === 'text' && node.text) {
              editableDraft.insertAt(insOffset, node.text)
              insOffset += node.text.length
            } else if (node.type.name === 'paragraph') {
              if (idx !== 0)
                // @ts-ignore
                editableDraft.insertBlock(insOffset++, node.type.name)

              let nodeText = node.textBetween(0, node.content.size)
              editableDraft.insertAt(insOffset, nodeText)
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
        let { from, to } = prosemirrorToAutomerge(step, editableDraft)

        editableDraft.mark(step.mark.type.name, `(${from}..${to})`, '')
      } else if (step instanceof RemoveMarkStep) {
        // TK not implemented because automerge doesn't support removing marks yet
      }
    }

    onChange(editableDraft)
    let newState = state.apply(transaction)
    setState(newState)
  }

  let color = colors[editableDraft.authorId]
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
