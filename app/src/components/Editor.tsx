/** @jsxImportSource @emotion/react */
import React, { useEffect, useRef } from 'react'
import { Transaction as AutomergeEdit, Author } from 'api'

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
import { convertAutomergeTransactionToProsemirrorTransaction } from '../prosemirror/utils/AutomergeToProsemirrorTransaction'
import { prosemirrorTransactionToAutomerge } from '../prosemirror/utils/ProsemirrorTransactionToAutomerge'
import {
  automergeChangesKey,
  automergeChangesPlugin,
} from '../prosemirror/AutomergeChangesPlugin'
import { debounce } from 'lodash'

const documents = Documents()
const log = Debug('Editor')

type Props = {
  upwellId: string
  editable: boolean
  editableDraftId: string
  historyHeads: string[] | false
  author: Author
}

export const editorSharedCSS = css`
  padding: 3rem calc(0.09 * 100vw); /* this isn't exactly what I want, just trying to keep padding slightly proportional to screen size. */
`

export const textCSS = css`
  width: 100%;
  flex: 1 1 auto;
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
  let { upwellId, historyHeads, editable, editableDraftId, author } = props

  const [state, setState] = React.useState<EditorState | null>(null)

  let upwell = documents.get(upwellId)

  let debouncedOnTextChange = React.useMemo(
    () =>
      debounce(() => {
        window.requestIdleCallback(() => {
          documents.save(upwellId)
        })
      }, 2000),
    [upwellId]
  )

  let onChange = () => {
    documents.rtcDraft?.updatePeers()
    debouncedOnTextChange()
  }

  /*
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
  */

  useEffect(() => {
    let upwell = documents.get(upwellId)
    let editableDraft = upwell.get(editableDraftId)
    let atjsonDraft = UpwellSource.fromRaw(editableDraft, upwell)
    let pmDoc = ProsemirrorRenderer.render(atjsonDraft)
    let editorConfig = {
      schema,
      doc: pmDoc,
      plugins: [
        contextMenu([commentButton(author)]),
        remoteCursorPlugin(),
        automergeChangesPlugin(
          upwell,
          editableDraft,
          author.id,
          upwell.rootDraft
        ),
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

    let newState = EditorState.create(editorConfig)
    let transaction = newState.tr.setMeta(automergeChangesKey, {
      heads: historyHeads,
    })
    setState(newState.apply(transaction))
  }, [editableDraftId, upwellId, author, historyHeads])

  let editableDraft = upwell.get(editableDraftId)
  log('got heads', historyHeads)

  const viewRef = useRef(null)

  useEffect(() => {
    if (!state) return
    let transaction = state.tr.setMeta(automergeChangesKey, {
      heads: historyHeads,
    })
    setState(state.apply(transaction))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyHeads])

  useEffect(() => {
    if (!state) return
    // @ts-ignore
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
  }, [editableDraftId, editableDraft, state])

  let dispatchHandler = (transaction: ProsemirrorTransaction) => {
    if (!state) return

    prosemirrorTransactionToAutomerge(
      transaction,
      editableDraft,
      state,
      documents
    )

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

    documents.draftChanged(upwell.id, editableDraft.id)
    onChange()
    let newState = state.apply(transaction)
    setState(newState)
  }

  let color = upwell.getAuthorColor(documents.author.id)
  if (!state) return <div>loading</div>
  return (
    <ProseMirror
      state={state}
      ref={viewRef}
      dispatchTransaction={dispatchHandler}
      editable={(state) => {
        return editable
      }}
      css={css`
        ${textCSS}
        caret-color: ${color || 'auto'};
        overflow-wrap: break-word;
        position: relative; /* for change bars */
      `}
    />
  )
}
