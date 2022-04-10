/** @jsxImportSource @emotion/react */
import React, { useEffect, useRef } from 'react'
import { Transaction as AutomergeEdit, Author } from 'api'
import deterministicColor from '../color'

import { schema } from '../prosemirror/UpwellSchema'
import {
  automergeToProsemirror,
  prosemirrorToAutomerge,
} from '../prosemirror/utils/PositionMapper'

import { ProseMirror } from 'use-prosemirror'
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
import {
  EditorState,
  Transaction as ProsemirrorTransaction,
} from 'prosemirror-state'

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
  automergeChangesKey,
  automergeChangesPlugin,
} from '../prosemirror/AutomergeChangesPlugin'
import { debounce } from 'lodash'

const documents = Documents()
const log = Debug('Editor')

type Props = {
  upwellId: string
  editableDraftId: string
  heads?: string[]
  author: Author
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

let prevHeads: any

export function Editor(props: Props) {
  let { upwellId, heads, editableDraftId, author, showEdits } = props

  const [state, setState] = React.useState<EditorState | null>(null)

  let upwell = documents.get(upwellId)

  let debouncedOnTextChange = React.useMemo(
    () =>
      debounce(() => {
        documents.save(upwellId)
        console.log('syncing from onTextChange')
      }, 500),
    [upwellId]
  )

  let onChange = () => {
    documents.rtcDraft?.updatePeers()
    debouncedOnTextChange()
  }

  function useTraceUpdate(propss: any) {
    const prev = useRef(propss)
    useEffect(() => {
      const changedProps = Object.entries(propss).reduce((ps: any, [k, v]) => {
        if (prev.current[k] !== v) {
          ps[k] = [prev.current[k], v]
        }
        return ps
      }, {})
      if (Object.keys(changedProps).length > 0) {
        console.log('Changed props:', changedProps)
      }
      prev.current = props
    })
  }

  // Usage
  useTraceUpdate(props)

  useEffect(() => {
    let upwell = documents.get(upwellId)
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

    setState(EditorState.create(editorConfig))
  }, [editableDraftId, upwellId, author])

  let editableDraft = upwell.get(editableDraftId)
  log('got heads', heads)

  const viewRef = useRef(null)

  useEffect(() => {
    console.log('showedits?')
    if (!state) return
    let transaction = state.tr.setMeta(automergeChangesKey, { showEdits })
    setState(state.apply(transaction))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEdits])

  useEffect(() => {
    if (!state) return
    console.log('heads?')
    let transaction = state.tr.setMeta(automergeChangesKey, { heads })
    setState(state.apply(transaction))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heads])

  useEffect(() => {
    if (!state) return
    // @ts-ignore
    if (documents.rtcDraft && documents.rtcDraft.draft.id === editableDraftId) {
      documents.rtcDraft.transactions.subscribe((edits: AutomergeEdit) => {
        let newHeads = editableDraft.doc.getHeads()
        let transaction = convertAutomergeTransactionToProsemirrorTransaction(
          editableDraft,
          state,
          edits
        )

        if (prevHeads && prevHeads !== newHeads) {
          let obj = editableDraft.doc.value('_root', 'text')
          let changeSet
          if (obj && obj[0] === 'text')
            changeSet = editableDraft.doc.attribute2(obj[1], prevHeads, [
              newHeads,
            ])
          if (changeSet) {
            if (transaction) {
              transaction.setMeta(automergeChangesKey, { changeSet })
            } else {
              transaction = state.tr.setMeta(automergeChangesKey, { changeSet })
            }
          }
        }
        prevHeads = newHeads
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

  let dispatchHandler = (transaction: ProsemirrorTransaction) => {
    if (!state) return
    let beforeHeads = editableDraft.doc.getHeads()
    editableDraft.addContributor(documents.author.id)
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
        if (text[gapStart - 1] !== '\uFFFC') {
          console.error(
            `Unhandled scenario in ReplaceAroundStep, expected character at ${gapStart} (${text[
              gapStart - 1
            ].charCodeAt(0)}) to be ${'\uFFFC'.charCodeAt(0)}`,
            step
          )
          continue
        }

        if (text[gapEnd] !== '\uFFFC' && gapEnd !== text.length) {
          console.error(
            `Unhandled scenario in ReplaceAroundStep, expected character at ${gapEnd} (${text[
              gapEnd
            ]?.charCodeAt(0)}) to be ${'\uFFFC'.charCodeAt(
              0
            )} or End of Document (${text.length})`,
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
          from: transaction.selection.ranges[0].$from.pos,
          to: transaction.selection.ranges[0].$to.pos,
        },
        editableDraft,
        state
      )
    )

    let afterHeads = editableDraft.doc.getHeads()
    let changeSet
    let amConfig = automergeChangesKey.getState(state)
    if (amConfig?.showChanges) {
      let obj = editableDraft.doc.value('_root', 'text')
      if (obj && obj[0] === 'text')
        changeSet = editableDraft.doc.attribute2(obj[1], beforeHeads, [
          afterHeads,
        ])

      transaction.setMeta(automergeChangesKey, { changeSet })
    }

    onChange()
    let newState = state.apply(transaction)
    setState(newState)
  }

  let color = deterministicColor(editableDraft.authorId)
  if (!state) return <div>loading</div>
  return (
    <ProseMirror
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
