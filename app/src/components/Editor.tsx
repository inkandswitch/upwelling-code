/** @jsxImportSource @emotion/react */
import React, { useEffect, useState, useRef } from 'react'
import { Transaction as AutomergeEdit, Upwell, Draft, Author } from 'api'
import { AuthorColorsType } from './ListDocuments'
//import Documents from '../Documents'

import { schema } from '../prosemirror/UpwellSchema'
import {
  automergeToProsemirror,
  prosemirrorToAutomerge,
  BLOCK_MARKER,
} from '../prosemirror/PositionMapper'

import { ProseMirror } from 'use-prosemirror'
import { keymap } from 'prosemirror-keymap'
import { Slice, Fragment } from 'prosemirror-model'
import { baseKeymap } from 'prosemirror-commands'
import { history, redo, undo } from 'prosemirror-history'
import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
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

let documents = Documents()

type Props = {
  upwell: Upwell
  editableDraftId: string
  author: Author
  onChange: any
  colors: AuthorColorsType
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
              let { from, to } = view.state.selection
              let message = prompt('what is your comment')
              let authorColor = colors[author.id].toString()
              let commentMark = schema.mark('comment', {
                id: 'new-comment',
                author: author,
                authorColor,
                message,
              })
              let tr = view.state.tr.addMark(from, to, commentMark)
              view.dispatch(tr)

              contextMenu.style.display = 'none'
            },
          },
        ]),
        remoteCursorPlugin(colors),
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
      documents.rtc.transactions.subscribe((edits: AutomergeEdit) => {
        if (edits.changes) {
          for (const changeset of edits.changes) {
            //{add: {start: 3, end: 4}, del: []}

            // FIXME this should work, but the attribution steps we're getting
            // back from automerge are incorrect, so it breaks.
            changeset.del.forEach((deleted) => {
              /*
              let text = deleted.val
              let { from, to } = automergeToProsemirror(
                { start: deleted.pos, end: deleted.pos + text.length },
                editableDraft
              )
              let fragment = Fragment.fromArray([])
              let slice = new Slice(fragment, 0, 0)
              let step = new ReplaceStep(from, to, slice)
              console.log(step)
              let transaction = state.tr.step(step)
              let newState = state.apply(transaction)
              setState(newState)
              */
            })

            changeset.add.forEach((added) => {
              let text = editableDraft.text.substring(added.start, added.end)
              let { from } = automergeToProsemirror(added, editableDraft)
              let nodes = []
              let blocks = text.split(BLOCK_MARKER)

              let depth = blocks.length > 1 ? 1 : 0

              // blocks: [ "text the first", "second text", "text" ]
              //          ^ no pgh break    ^ pgh break    ^ pgh break 2

              // the first text node here doesn't get a paragraph break
              let block = blocks.shift()
              if (!block) {
                let node = schema.node('paragraph', {}, [])
                nodes.push(node)
              } else {
                if (blocks.length === 0) nodes.push(schema.text(block))
                else
                  nodes.push(schema.node('paragraph', {}, schema.text(block)))
              }

              blocks.forEach((block) => {
                // FIXME this might be wrong for e.g. a paste with multiple empty paragraphs
                if (block.length === 0) {
                  nodes.push(schema.node('paragraph', {}, []))
                  return
                } else {
                  let node = schema.node('paragraph', {}, schema.text(block))
                  nodes.push(node)
                }
              })

              let fragment = Fragment.fromArray(nodes)
              let slice = new Slice(fragment, depth, depth)

              let step = new ReplaceStep(from, from, slice)
              let transaction = state.tr.step(step)
              let newState = state.apply(transaction)
              setState(newState)
            })
          }
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
      documents.rtc?.transactions.unsubscribe()
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
        } else {
          editableDraft.mark(mark.type.name, `(${start}..${end})`, '')
        }
      } else if (step instanceof RemoveMarkStep) {
        // TK not implemented because automerge doesn't support removing marks yet
      }
    }

    documents.rtc?.sendCursorMessage(
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
