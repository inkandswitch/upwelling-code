/** @jsxImportSource @emotion/react */
import React, { useEffect, useState, useRef } from 'react'
import { Transaction as AutomergeEdit, Upwell, Draft, Author } from 'api'
import { AuthorColorsType } from './ListDocuments'
//import Documents from '../Documents'

import { schema } from '../upwell-pm-schema'
import { ProseMirror } from 'use-prosemirror'
import { keymap } from 'prosemirror-keymap'
import { MarkType, Slice, Fragment } from 'prosemirror-model'
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

let automergeToProsemirror = (
  step: { start: number; end: number },
  draft: Draft
) => {
  return {
    from: automergeToProsemirrorNumber(step.start, draft),
    to: automergeToProsemirrorNumber(step.end, draft),
  }
}

const OPENING_TAG = '\uFFFC'

let automergeToProsemirrorNumber = (position: number, draft: Draft) => {
  let i = 0
  let l = draft.text.length
  while (i < l) {
    //boop
    i = draft.text.indexOf(OPENING_TAG, i + 1)
    if (i >= position || i === -1) break
    // add one because prosemirror has a closing tag but automerge doesn't
    position++
  }
  return position
}

let prosemirrorToAutomergeNumber = (position: number, draft: Draft): number => {
  let i = 0
  let l = draft.text.length

  while (i < l) {
    i = draft.text.indexOf(OPENING_TAG, i + 1)
    if (i >= position || i === -1) break
    // subtract one because prosemirror has a closing tag but automerge doesn't
    position--
  }
  return position
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
        console.log('edits', edits)
        if (edits.changes) {
          for (const changeset of edits.changes) {
            //{add: {start: 3, end: 4}, del: []}
            changeset.add.forEach((added) => {
              let text = editableDraft.text.substring(added.start, added.end)
              let { from } = automergeToProsemirror(added, editableDraft)
              let nodes = []
              let blocks = text.split(OPENING_TAG)

              let depth = blocks.length > 1 ? 1 : 0

              // blocks: [ "text the first", "second text", "text" ]
              //          ^ no pgh break    ^ pgh break    ^ pgh break 2

              // the first text node here doesn't get a paragraph break
              let block = blocks.shift()
              if (!block) {
                let node = schema.node('paragraph', {}, schema.text('\n'))
                nodes.push(node)
              } else {
                nodes.push(schema.text(block))
              }

              blocks.forEach((block) => {
                if (block.length === 0) block = '\n'
                let node = schema.node('paragraph', {}, schema.text(block))
                nodes.push(node)
              })

              console.log(nodes)
              let fragment = Fragment.fromArray(nodes)
              let slice = new Slice(fragment, depth, depth)

              console.log('slice', slice)
              let step = new ReplaceStep(from, from, slice)
              console.log('step', step)
              let transaction = state.tr.step(step)
              console.log('transaction', transaction)
              let newState = state.apply(transaction)
              setState(newState)
            })
            // TODO: transform automerge to prosemirror transaction
          }
        }
        if (edits.cursor) {
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
          console.log('the prosemirror transaction was', step.slice)
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
        let mark = step.mark

        if (mark.type.name === 'comment') {
          editableDraft.insertComment(
            from,
            to,
            mark.attrs.message,
            mark.attrs.author.id
          )
        } else {
          editableDraft.mark(mark.type.name, `(${from}..${to})`, '')
        }
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
