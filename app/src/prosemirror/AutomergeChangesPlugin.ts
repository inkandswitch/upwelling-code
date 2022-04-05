import { Decoration, DecorationSet } from 'prosemirror-view'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Node } from 'prosemirror-model'
import { Draft, Upwell } from 'api'
import deterministicColor from '../color'
import { automergeToProsemirror } from './utils/PositionMapper'
import { ChangeSet } from 'automerge-wasm-pack'

export const automergeChangesKey = new PluginKey('automergeChanges')

function changeSetToInlineDecorations(changeSet: ChangeSet, draft: Draft) {
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

function changeSetToMarginDecorations(changeSet: ChangeSet, draft: Draft) {
  return changeSet.add.map((change) => {
    let { from, to } = automergeToProsemirror(change, draft)
    return Decoration.widget(from, (view, getPos) => {
      let sidebarThing = document.createElement('div')
      sidebarThing.style.position = 'absolute'
      let fromCoords = view.coordsAtPos(from)
      let toCoords = view.coordsAtPos(to)
      console.log(fromCoords, toCoords)
      sidebarThing.style.top = `${fromCoords.top}px`
      sidebarThing.style.height = `${toCoords.bottom - fromCoords.top}px`
      sidebarThing.style.left = `${
        view.dom.clientLeft +
        parseFloat(
          window
            .getComputedStyle(view.dom, null)
            .getPropertyValue('padding-left')
        ) -
        5
      }px`
      sidebarThing.style.width = '3px'
      sidebarThing.style.borderRadius = '3px'
      sidebarThing.style.background = deterministicColor(
        change.actor.split('0000')[0]
      ).toString()
      console.log(sidebarThing)
      console.log(view, getPos())
      console.log(view.coordsAtPos(from))
      console.log(view.coordsAtPos(to))
      return sidebarThing
    })
  })
}

function getAllChanges(baseDraft: Draft, draft: Draft, doc: Node) {
  let { attribution } = Draft.mergeWithEdits(
    { id: draft.authorId, name: '' },
    baseDraft,
    draft
  )
  let decorations = changeSetToInlineDecorations(attribution[0], draft)
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
          decorations: getAllChanges(baseDraft, initialDraft, state.doc),
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
            let obj = initialDraft.doc.value('_root', 'text', heads)
            let latestObj = initialDraft.doc.value(
              '_root',
              'text',
              baseDraft.doc.getHeads()
            )

            if (
              obj &&
              obj[0] === 'text' &&
              latestObj &&
              latestObj[0] === 'text'
            ) {
              console.log({
                heads: { heads, text: initialDraft.doc.text(obj[1], heads) },
                initial: {
                  heads: initialDraft.doc.getHeads(),
                  text: initialDraft.text,
                },
                base: { heads: baseDraft.doc.getHeads(), text: baseDraft.text },
              })
              let history = initialDraft.doc.attribute2(obj[1], heads, [
                baseDraft.doc.getHeads(),
              ])
              let newHistory = initialDraft.doc.attribute2(
                latestObj[1],
                baseDraft.doc.getHeads(),
                [initialDraft.doc.getHeads()]
              )
              let before = changeSetToInlineDecorations(
                history[0],
                initialDraft
              )
              let beforeMargins = changeSetToMarginDecorations(
                history[0],
                initialDraft
              )
              let after = changeSetToInlineDecorations(
                newHistory[0],
                initialDraft
              )
              prev.decorations = DecorationSet.create(tr.doc, before)
                .add(tr.doc, after)
                .add(tr.doc, beforeMargins)

              console.log({ history, newHistory })
              // FIXME this isn't working for some reason. attribute2 is a bit finnicky.
            }
          }

          if (showEdits === true) {
            prev.showEdits = true
            prev.decorations = getAllChanges(
              baseDraft,
              initialDraft,
              newState.doc
            )
          } else if (automergeChanges.showEdits === false) {
            prev.showEdits = false
          }
        }

        // just a little optimization - don't do work we don't have to.
        if (!prev.showEdits) return prev

        if (automergeChanges?.changeSet) {
          let newDecos = changeSetToInlineDecorations(
            automergeChanges.changeSet[0],
            initialDraft
          )
          let decorations: DecorationSet = prev.decorations
          prev.decorations = decorations
            .map(tr.mapping, tr.doc)
            .add(tr.doc, newDecos)
        } else if (tr.steps.length > 0) {
          prev.decorations = getAllChanges(
            baseDraft,
            initialDraft,
            newState.doc
          )
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
