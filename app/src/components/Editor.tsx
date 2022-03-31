/** @jsxImportSource @emotion/react */
//import Documents from '../Documents'
import React, { useEffect, useState, useRef } from 'react'
import { Transaction as AutomergeEdit, Upwell, Author } from 'api'
import deterministicColor from '../color'

import { schema } from '../prosemirror/UpwellSchema'
import {
  automergeToProsemirror,
  prosemirrorToAutomerge,
} from '../prosemirror/utils/PositionMapper'

import { ProseMirror } from 'use-prosemirror'
import { keymap } from 'prosemirror-keymap'
import { baseKeymap } from 'prosemirror-commands'
import { history, redo, undo } from 'prosemirror-history'
import { EditorState } from 'prosemirror-state'
import { ReplaceStep, AddMarkStep, RemoveMarkStep } from 'prosemirror-transform'

import { contextMenu } from '../prosemirror/ContextMenuPlugin'
import {
  remoteCursorPlugin,
  remoteCursorKey,
} from '../prosemirror/RemoteCursorPlugin'
import { toggleBold, toggleItalic } from '../prosemirror/Commands'

import ProsemirrorRenderer from '../prosemirror/ProsemirrorRenderer'
import UpwellSource from './upwell-source'
import { css } from '@emotion/react'
import Documents from '../Documents'
import { commentButton } from '../prosemirror/context-menu-items/CommentButton'
import { convertAutomergeTransactionToProsemirrorTransaction } from '../prosemirror/utils/TransformHelper'

let documents = Documents()

type Props = {
  upwell: Upwell
  editableDraftId: string
  heads?: string[]
  author: Author
  onChange: any
}

export const editorSharedCSS = css`
  padding: 3rem calc(0.09 * 100vw); /* this isn't exactly what I want, just trying to keep padding slightly proportional to screen size. */
`

export const textCSS = css`
  width: 100%;
  height: 100%;
  border: none;
  resize: none;
  font-size: 16px;
  line-height: 20px;
  background-color: white;
  overflow: auto;

  white-space: pre-line;

  .ProseMirror {
    width: 100%;
    height: 100%;
    ${editorSharedCSS}
  }
  .ProseMirror:focus-visible {
    outline: 0;
  }
`

export function Editor(props: Props) {
  let { heads, upwell, editableDraftId, onChange, author } = props

  function getState(pmDoc: any) {
    return EditorState.create({
      schema,
      doc: pmDoc,
      plugins: [
        contextMenu([commentButton(author)]),
        remoteCursorPlugin(),
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
  let atjsonDraft = UpwellSource.fromRaw(editableDraft)
  let pmDoc = ProsemirrorRenderer.render(atjsonDraft)
  const [state, setState] = useState<EditorState>(getState(pmDoc))
  //const [heads, setHeads] = useState<string[]>(editableDraft.doc.getHeads())

  const viewRef = useRef(null)

  useEffect(() => {
    if (documents.rtcDraft && documents.rtcDraft.draft.id === editableDraftId) {
      documents.rtcDraft.transactions.subscribe((edits: AutomergeEdit) => {
        let transaction = convertAutomergeTransactionToProsemirrorTransaction(
          editableDraft,
          state,
          edits
        )
        if (transaction) {
          let newState = state.apply(transaction)
          setState(newState)
        }

        if (edits.cursor) {
          let remoteCursors = state.tr.getMeta(remoteCursorKey)
          if (!remoteCursors) remoteCursors = {}
          remoteCursors[edits.author.id] = automergeToProsemirror(
            edits.cursor,
            editableDraft
          )
          let transaction = state.tr.setMeta(remoteCursorKey, remoteCursors)
          let newState = state.apply(transaction)
          setState(newState)
        }
      })
    }
    return () => {
      documents.rtcDraft?.transactions.unsubscribe()
    }
  })

  let dispatchHandler = (transaction: any) => {
    for (let step of transaction.steps) {
      if (step instanceof ReplaceStep) {
        let { start, end } = prosemirrorToAutomerge(step, editableDraft, state)

        if (end !== start) {
          editableDraft.deleteAt(start, end - start)
        }

        if (step.slice) {
          let insOffset = start
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
        let { start, end } = prosemirrorToAutomerge(step, editableDraft, state)
        let mark = step.mark

        if (mark.type.name === 'comment') {
          editableDraft.insertComment(
            start,
            end,
            mark.attrs.message,
            mark.attrs.author.id
          )
          documents.draftChanged(upwell.id, editableDraft.id)
        } else {
          editableDraft.mark(mark.type.name, `(${start}..${end})`, true)
        }
      } else if (step instanceof RemoveMarkStep) {
        // TK not implemented because automerge doesn't support removing marks yet
        let { start, end } = prosemirrorToAutomerge(step, editableDraft, state)
        let mark = step.mark
        if (mark.type.name === 'strong' || mark.type.name === 'em') {
          editableDraft.mark(mark.type.name, `(${start}..${end})`, false)
        }
      }
    }

    documents.rtcDraft?.sendCursorMessage(
      prosemirrorToAutomerge(
        {
          from: transaction.curSelection.ranges[0].$from.pos,
          to: transaction.curSelection.ranges[0].$to.pos,
        },
        editableDraft,
        state
      )
    )

    onChange(editableDraft)
    let newState = state.apply(transaction)
    setState(newState)
  }

  let color = deterministicColor(editableDraft.authorId)
  return (
    <ProseMirror
      editable={() => props.editableDraftId !== upwell.rootDraft.id}
      state={state}
      ref={viewRef}
      dispatchTransaction={dispatchHandler}
      css={css`
        ${textCSS}
        caret-color: ${color?.copy({ opacity: 1 }).toString() || 'auto'};
      `}
    />
  )
}
