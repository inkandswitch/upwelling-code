import { ReplaceStep } from 'prosemirror-transform'
import { Fragment, Slice } from 'prosemirror-model'
import { EditorState, Transaction } from 'prosemirror-state'
import { schema } from '../UpwellSchema'
import { automergeToProsemirror, BLOCK_MARKER } from './PositionMapper'
// @okdistribute is there a better way to re-export these, or should we wrap
// them, or just use them like this?
import { ChangeSetAddition, ChangeSetDeletion } from 'automerge-wasm-pack'

import { Draft, Transaction as AutomergeTransaction } from 'api'

const convertAddToStep: (
  draft: Draft
) => (added: ChangeSetAddition) => ReplaceStep = (draft: Draft) => {
  return (added: ChangeSetAddition) => {
    let text = draft.text.substring(added.start, added.end)
    let { from } = automergeToProsemirror(added, draft)
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
      if (blocks.length === 0) {
        nodes.push(schema.text(block))
      } else {
        nodes.push(schema.node('paragraph', {}, schema.text(block)))
      }
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

    return new ReplaceStep(from, from, slice)
  }
}

const convertDeleteToStep: (
  draft: Draft
) => (deleted: ChangeSetDeletion) => ReplaceStep = (draft: Draft) => {
  // FIXME this should work, but the attribution steps we're getting
  // back from automerge are incorrect, so it breaks.
  return (deleted) => {
    let text = deleted.val
    let { from, to } = automergeToProsemirror(
      { start: deleted.pos, end: deleted.pos + text.length },
      draft
    )
    let fragment = Fragment.fromArray([])
    let slice = new Slice(fragment, 0, 0)
    return new ReplaceStep(from, to, slice)
  }
}

export const convertAutomergeTransactionToProsemirrorTransaction: (
  draft: Draft,
  state: EditorState,
  edits: AutomergeTransaction
) => Transaction | undefined = (
  draft: Draft,
  state: EditorState,
  edits: AutomergeTransaction
) => {
  if (!edits.changes) return

  let steps: ReplaceStep[] = []

  for (const changeset of edits.changes) {
    //{add: {start: 3, end: 4}, del: []}

    //steps = changeset.del.map(convertDeleteToStep(draft))
    steps = changeset.add.map(convertAddToStep(draft))
    // once delete is enabled uncomment this:
    steps = steps.concat(changeset.del.map(convertDeleteToStep(draft)))
  }
  if (!steps.length) {
    return
  }

  return state.tr.step(steps[0])
}
