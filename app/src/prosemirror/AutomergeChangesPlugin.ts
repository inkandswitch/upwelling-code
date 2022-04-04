import { Decoration, DecorationSet } from 'prosemirror-view'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Node } from 'prosemirror-model'
import { Draft, Upwell } from 'api'
import deterministicColor from '../color'
import { automergeToProsemirror } from './utils/PositionMapper'
import { ChangeSet } from 'automerge-wasm-pack'
import { ReplaceStep } from 'prosemirror-transform'

export const automergeChangesKey = new PluginKey('automergeChanges')
export const showEditsKey = new PluginKey('showEdits')

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

let showEdits = false

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
        return getAllChanges(baseDraft, initialDraft, state.doc)
      },

      apply(tr, changes, oldState, newState) {
        let showEditsNow = tr.getMeta(showEditsKey)
        if (showEditsNow === true) {
          showEdits = showEditsNow
          return getAllChanges(baseDraft, initialDraft, tr.doc)
        } else if (showEditsNow === false) {
          showEdits = showEditsNow
          return DecorationSet.create(tr.doc, [])
        }

        const automergeChanges = tr.getMeta(automergeChangesKey)

        if (!automergeChanges && changes) {
          // Local change
          let decorations: DecorationSet = changes.map(tr.mapping, tr.doc)

          if (showEdits === false) return decorations

          let newDecorations: Decoration[] = []

          for (let step of tr.steps) {
            if (step instanceof ReplaceStep) {
              step.slice.content.forEach((node) => {
                if (node.type.name === 'text' && node.text) {
                  newDecorations.push(
                    Decoration.inline(
                      //@ts-ignore
                      step.from, //@ts-ignore
                      step.from + node.text.length,
                      {
                        style: `background: ${deterministicColor(
                          authorId,
                          0.15
                        )}`,
                      }
                    )
                  )
                }
              })
            }
          }

          return decorations.add(tr.doc, newDecorations)
        }

        let { draft } = automergeChanges

        let { attribution } = Draft.mergeWithEdits(
          draft.authorId,
          baseDraft,
          draft
        )

        let decorations = changeSetToDecorations(attribution[0], draft)
        return DecorationSet.create(tr.doc, decorations)
      },
    },

    props: {
      decorations(state) {
        return automergeChangesKey.getState(state)
      },
    },
  })
}
