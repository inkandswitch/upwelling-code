import { Draft } from 'api'
import { ChangeSet } from 'automerge-wasm-pack'
import { EditorState, Transaction } from 'prosemirror-state'
import {
  AddMarkStep,
  RemoveMarkStep,
  ReplaceAroundStep,
  ReplaceStep,
} from 'prosemirror-transform'
import { Documents } from '../../Documents'
import { automergeChangesKey } from '../AutomergeChangesPlugin'
import { prosemirrorToAutomerge } from './PositionMapper'

const emptyChangeSet: ChangeSet = { add: [], del: [] }

function handleReplaceStep(
  step: ReplaceStep,
  editableDraft: Draft,
  state: EditorState
): ChangeSet {
  let changeSet: ChangeSet = {
    add: [],
    del: [],
  }

  let { start, end } = prosemirrorToAutomerge(step, editableDraft, state)

  if (end !== start) {
    let deleted = editableDraft.deleteAt(start, end - start)
    changeSet.del.push({
      actor: editableDraft.doc.getActorId(),
      pos: start,
      val: deleted?.join('') || '',
    })
  }

  if (step.slice) {
    let insOffset = start
    step.slice.content.forEach((node, idx) => {
      if (node.type.name === 'text' && node.text) {
        changeSet.add.push({
          actor: editableDraft.doc.getActorId(),
          start,
          end: start + node.text.length,
        })
        editableDraft.insertAt(insOffset, node.text)
        insOffset += node.text.length
      } else if (['paragraph', 'heading'].indexOf(node.type.name) !== -1) {
        if (idx !== 0)
          // @ts-ignore
          editableDraft.insertBlock(insOffset++, node.type.name)

        let nodeText = node.textBetween(0, node.content.size)
        changeSet.add.push({
          actor: editableDraft.doc.getActorId(),
          start,
          end: start + nodeText.length,
        })
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

  return changeSet
}

function handleAddMarkStep(
  step: AddMarkStep,
  editableDraft: Draft,
  state: EditorState
): ChangeSet {
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
    editableDraft.mark(mark.type.name, `(${start}..${end})`, true)
  }

  // no way to encode mark changes in automerge attribution changesets (just yet)
  return emptyChangeSet
}

function handleRemoveMarkStep(
  step: RemoveMarkStep,
  editableDraft: Draft,
  state: EditorState
): ChangeSet {
  // TK not implemented because automerge doesn't support removing marks yet
  let { start, end } = prosemirrorToAutomerge(step, editableDraft, state)
  let mark = step.mark
  if (mark.type.name === 'strong' || mark.type.name === 'em') {
    editableDraft.mark(mark.type.name, `(${start}..${end})`, false)
  }

  // no way to encode mark changes in automerge attribution changesets (just yet)
  return emptyChangeSet
}

function handleReplaceAroundStep(
  step: ReplaceAroundStep,
  editableDraft: Draft,
  state: EditorState
): ChangeSet {
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
    return emptyChangeSet
  }

  if (text[gapEnd] !== '\uFFFC' && gapEnd !== text.length) {
    console.error(
      `Unhandled scenario in ReplaceAroundStep, expected character at ${gapEnd} (${text[
        gapEnd
      ]?.charCodeAt(0)}) to be ${'\uFFFC'.charCodeAt(0)} or End of Document (${
        text.length
      })`,
      step
    )
    return emptyChangeSet
  }

  // Get the replacement node and extract its attributes and reset the block!
  let node = step.slice.content.maybeChild(0)
  if (!node) return emptyChangeSet

  let { type, attrs } = node

  editableDraft.setBlock(gapStart - 1, type.name, attrs)

  // setBlock doesn't map to a changeSet
  return emptyChangeSet
}

export const prosemirrorTransactionToAutomerge = (
  transaction: Transaction,
  editableDraft: Draft,
  state: EditorState,
  documents: Documents
) => {
  let changeSets: ChangeSet[] = []
  let hasChanges = false

  for (let step of transaction.steps) {
    if (step instanceof ReplaceStep) {
      hasChanges = true
      let replaceChanges = handleReplaceStep(step, editableDraft, state)
      changeSets = changeSets.concat(replaceChanges)
    } else if (step instanceof AddMarkStep) {
      hasChanges = true
      let addMarkChanges = handleAddMarkStep(step, editableDraft, state)
      changeSets = changeSets.concat(addMarkChanges)
    } else if (step instanceof RemoveMarkStep) {
      hasChanges = true
      let removeMarkChanges = handleRemoveMarkStep(step, editableDraft, state)
      changeSets = changeSets.concat(removeMarkChanges)
    } else if (step instanceof ReplaceAroundStep) {
      hasChanges = true
      let replaceAroundStepChanges = handleReplaceAroundStep(
        step,
        editableDraft,
        state
      )

      changeSets = changeSets.concat(replaceAroundStepChanges)
    }
  }

  if (hasChanges) {
    editableDraft.addContributor(documents.author.id)
    editableDraft.edited_at = Date.now()
  }

  // Combine ChangeSets from all steps.
  let changeSet = [
    changeSets.reduce((prev, curr) => {
      return {
        add: prev.add.concat(curr.add),
        del: prev.del.concat(curr.del),
      }
    }, emptyChangeSet),
  ]

  transaction.setMeta(automergeChangesKey, { changeSet })
}
