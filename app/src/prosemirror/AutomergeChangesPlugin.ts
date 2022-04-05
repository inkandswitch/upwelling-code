import { Decoration, DecorationSet } from 'prosemirror-view'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Node } from 'prosemirror-model'
import { Draft, Upwell } from 'api'
import deterministicColor from '../color'
import { automergeToProsemirror } from './utils/PositionMapper'
import { ChangeSet } from 'automerge-wasm-pack'
import { ReplaceStep } from 'prosemirror-transform'

export const automergeChangesKey = new PluginKey('automergeChanges')

function changeSetToDecorations(changeSet: ChangeSet, draft: Draft) {
  return changeSet.add.map((change) => {
    let { from, to } = automergeToProsemirror(change, draft)
    return Decoration.inline(from, to, {
      style: `background: ${deterministicColor(
        change.actor.split('0000')[0],
        0.15
      )}`,
    })
  })
}

function getAllChanges(baseDraft: Draft, draft: Draft, doc: Node) {
  let { attribution } = Draft.mergeWithEdits(
    { id: draft.authorId, name: '' },
    baseDraft,
    draft
  )
  let decorations = changeSetToDecorations(attribution[0], draft)
  return DecorationSet.create(doc, decorations)
}

export const automergeChangesPlugin: (
  upwell: Upwell,
  initialDraft: Draft,
  authorId: string
) => Plugin = (upwell, initialDraft, authorId) => {
  const baseDraft = upwell.rootDraft

  return new Plugin({
    key: automergeChangesKey,

    state: {
      init(_, state) {
        return {
          heads: null,
          showEdits: false,
          decorations: getAllChanges(baseDraft, initialDraft, state.doc)
        }
      },

      apply(tr, prev, oldState, newState) {

        let automergeChanges = tr.getMeta(automergeChangesKey)

        // Handle config changes
        if (automergeChanges) {
          let { heads, showEdits } = automergeChanges

          if (heads) {
            // fixme recompute changes
            prev.heads = automergeChanges.heads
            console.log(heads, initialDraft.doc.getHeads(), baseDraft.doc.getHeads())
            let obj = initialDraft.doc.value('_root', 'text')
            if (obj && obj[0] === 'text') {
              let attr = baseDraft.doc.attribute2(obj[1], baseDraft.doc.getHeads(), [heads, initialDraft.doc.getHeads()])
              console.log(attr)
              // FIXME this isn't working for some reason. attribute2 is a bit finnicky.
            }
          }

          if (showEdits === true) {
            prev.showEdits = true
            prev.decorations = getAllChanges(baseDraft, initialDraft, newState.doc)
          } else if (automergeChanges.showEdits === false) {
            prev.showEdits = false
          }
        }

        // just a little optimization - don't do work we don't have to.
        if (!prev.showEdits) return prev

        if (automergeChanges?.changeSet) {
          let newDecos = changeSetToDecorations(automergeChanges.changeSet[0], initialDraft)
          let decorations: DecorationSet = prev.decorations
          prev.decorations = decorations.map(tr.mapping, tr.doc).add(tr.doc, newDecos)
        } else if (tr.steps.length > 0) {
          prev.decorations = getAllChanges(baseDraft, initialDraft, newState.doc)
        }
        return prev
      },
    },

    props: {
      decorations(state) {
        let amState = automergeChangesKey.getState(state)
        if (amState.showEdits) {
          return amState.decorations
        } else {
          return DecorationSet.empty
        }
      },
    },
  })
}
