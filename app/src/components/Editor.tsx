/** @jsxImportSource @emotion/react */
import React, { useEffect, useRef } from 'react'
import { Transaction as AutomergeEdit, Upwell, Author } from 'api'
import deterministicColor from '../color'

import { schema } from '../prosemirror/UpwellSchema'
import {
  automergeToProsemirror,
  prosemirrorToAutomerge,
} from '../prosemirror/utils/PositionMapper'

import { ProseMirror, useProseMirror } from 'use-prosemirror'
import { keymap } from 'prosemirror-keymap'
import { baseKeymap, setBlockType } from 'prosemirror-commands'
import { history, redo, undo } from 'prosemirror-history'
import Debug from 'debug'
import {
  ReplaceStep,
  AddMarkStep,
  RemoveMarkStep,
  ReplaceAroundStep,
} from 'prosemirror-transform'

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
import {
  showEditsKey,
  automergeChangesPlugin,
} from '../prosemirror/AutomergeChangesPlugin'

const documents = Documents()
const log = Debug('Editor')

type Props = {
  upwell: Upwell
  editableDraftId: string
  heads?: string[]
  author: Author
  onChange: any
  showEdits: boolean
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
  let { upwell, heads, editableDraftId, onChange, author, showEdits } = props

  let editableDraft = upwell.get(editableDraftId)

  let atjsonDraft = UpwellSource.fromRaw(editableDraft)
  let pmDoc = ProsemirrorRenderer.render(atjsonDraft)
  let editorConfig = {
    schema,
    doc: pmDoc,
    plugins: [
      contextMenu([commentButton(author)]),
      remoteCursorPlugin(),
      automergeChangesPlugin(upwell, editableDraft, author.id),
      history(),
      keymap({
        ...baseKeymap,
        'Mod-z': undo,
        'Mod-y': redo,
        'Mod-Shift-z': redo,
        'Mod-b': toggleBold,
        'Mod-i': toggleItalic,
        'Ctrl-Alt-0': setBlockType(schema.nodes.paragraph),
        'Ctrl-Alt-1': setBlockType(schema.nodes.heading, { level: 1 }),
        'Ctrl-Alt-2': setBlockType(schema.nodes.heading, { level: 2 }),
        'Ctrl-Alt-3': setBlockType(schema.nodes.heading, { level: 3 }),
        'Ctrl-Alt-4': setBlockType(schema.nodes.heading, { level: 4 }),
        'Ctrl-Alt-5': setBlockType(schema.nodes.heading, { level: 5 }),
        'Ctrl-Alt-6': setBlockType(schema.nodes.heading, { level: 6 }),
      }),
    ],
  }

  const [state, setState] = useProseMirror(editorConfig)
  log('got heads', heads)

  const viewRef = useRef(null)

  useEffect(() => {
    let transaction = state.tr.setMeta(showEditsKey, showEdits)
    let newState = state.apply(transaction)
    setState(newState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEdits])

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
            } else if (
              ['paragraph', 'heading'].indexOf(node.type.name) !== -1
            ) {
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
      } else if (step instanceof ReplaceAroundStep) {
        // This is just a guard to prevent us from handling a ReplaceAroundStep
        // that isn't simply replacing the container, because implementing that
        // is complicated and I can't think of an example where this would be
        // the case!
        //
        // e.g. the normal case for p -> h1:
        //   start == <p>
        //   end == </p>
        //   gapStart == the first character of the paragraph
        //   gapEnd == the last character of the paragraph
        //
        // The step contains an empty node that has a `heading` type instead of
        // `paragraph`
        //
        if (
          //@ts-ignore: step.structure isn't defined in prosemirror's types
          !step.structure ||
          step.insert !== 1 ||
          step.from !== step.gapFrom - 1 ||
          step.to !== step.gapTo + 1
        ) {
          console.debug(
            'Unhandled scenario in ReplaceAroundStep (non-structure)',
            step
          )
        }

        let { start: gapStart, end: gapEnd } = prosemirrorToAutomerge(
          { from: step.gapFrom, to: step.gapTo },
          editableDraft,
          state
        )

        let text = editableDraft.text
        // Double-check that we're doing what we think we are, i.e., replacing a parent node
        if (text[gapStart - 1] !== '\uFFFC' || text[gapEnd] !== '\uFFFC') {
          console.debug(
            `Unhandled scenario in ReplaceAroundStep, expected ${text[
              gapStart - 1
            ].charCodeAt(0)} and ${text[gapEnd].charCodeAt(
              0
            )} == ${'\uFFFC'.charCodeAt(0)}`,
            step
          )
          continue
        }

        // Get the replacement node and extract its attributes and reset the block!
        let node = step.slice.content.maybeChild(0)
        if (!node) continue

        let { type, attrs } = node

        editableDraft.setBlock(gapStart - 1, type.name, attrs)
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
