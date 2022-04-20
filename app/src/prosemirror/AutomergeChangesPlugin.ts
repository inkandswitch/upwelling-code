import { Decoration, DecorationSet } from 'prosemirror-view'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Node } from 'prosemirror-model'
import { Draft, Upwell } from 'api'
import { automergeToProsemirror } from './utils/PositionMapper'
import { ChangeSet } from 'automerge-wasm-pack'
import Documents from '../Documents'
import { getAuthorHighlight } from '../util'

let documents = Documents()!

export const automergeChangesKey = new PluginKey('automergeChanges')

function changeSetToInlineDecorations(changeSet: ChangeSet, draft: Draft) {
  return changeSet.add.map((change) => {
    let { from, to } = automergeToProsemirror(change, draft)
    let id = change.actor.slice(0, 32)
    let color = documents.upwell!.getAuthorColor(id)
    return Decoration.inline(from, to, {
      style: `background: ${getAuthorHighlight(color)}`,
    })
  })
}

function changeSetToMarginDecorations(changeSet: ChangeSet, draft: Draft) {
  return changeSet.add.map((change) => {
    let { from, to } = automergeToProsemirror(change, draft)
    if (draft.text[change.start] === '\uFFFC') from += 1
    return Decoration.widget(from, (view, getPos) => {
      let sidebarThing = document.createElement('div')
      sidebarThing.style.position = 'absolute'
      let fromCoords = view.coordsAtPos(from)
      let toCoords = view.coordsAtPos(to)
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
      sidebarThing.style.background = documents.upwell!.getAuthorColor(
        change.actor.slice(0, 32)
      )
      return sidebarThing
    })
  })
}

function getOldChanges(
  editableDraft: Draft,
  heads: string[],
  baseDraft: Draft
) {
  let obj = editableDraft.doc.get('_root', 'text', heads)

  if (obj && obj[0] === 'text') {
    if (heads.length > 0) {
      let history = editableDraft.doc.attribute2(obj[1], heads, [
        baseDraft.doc.getHeads(),
      ])
      let before = changeSetToInlineDecorations(history[0], editableDraft)
      let beforeMargins = changeSetToMarginDecorations(
        history[0],
        editableDraft
      )
      return before.concat(beforeMargins)
    }
  }
  return []
}

function getNewChanges(editableDraft: Draft, baseDraft: Draft) {
  let latestObj = editableDraft.doc.get(
    '_root',
    'text',
    baseDraft.doc.getHeads()
  )
  if (latestObj && latestObj[0] === 'text') {
    let newHistory = editableDraft.doc.attribute2(
      latestObj[1],
      baseDraft.doc.getHeads(),
      [editableDraft.doc.getHeads()]
    )
    let after = changeSetToInlineDecorations(newHistory[0], editableDraft)
    return after
  }
  return []
}

function getAllChanges(
  upwell: Upwell,
  baseDraft: Draft,
  draft: Draft,
  doc: Node
) {
  let { attribution } = upwell.mergeWithEdits(
    { id: draft.authorId, name: '' },
    baseDraft,
    draft
  )
  let decorations = changeSetToInlineDecorations(attribution[0], draft)
  return DecorationSet.create(doc, decorations)
}

export const automergeChangesPlugin: (
  upwell: Upwell,
  editableDraft: Draft,
  authorId: string,
  baseDraft: Draft
) => Plugin = (upwell, editableDraft, authorId, baseDraft) => {
  return new Plugin({
    key: automergeChangesKey,

    state: {
      init(_, state) {
        return {
          heads: false,
          decorations: getAllChanges(
            upwell,
            baseDraft,
            editableDraft,
            state.doc
          ),
        }
      },

      apply(tr, prev, oldState, newState) {
        let automergeChanges = tr.getMeta(automergeChangesKey)
        if (!automergeChanges) return prev

        // Handle config changes
        let { heads, changeSet } = automergeChanges

        if (heads === false) {
          prev.heads = false
          prev.decorations = DecorationSet.empty
          return prev
        }

        if (heads) {
          prev.heads = automergeChanges.heads

          let oldChanges = getOldChanges(editableDraft, heads, baseDraft)
          let newChanges = getNewChanges(editableDraft, baseDraft)

          let set = DecorationSet.create(tr.doc, [])
          prev.decorations = set.add(tr.doc, oldChanges).add(tr.doc, newChanges)
        }

        if (!heads && changeSet) {
          let newDecos = changeSetToInlineDecorations(
            automergeChanges.changeSet[0],
            editableDraft
          )
          let decorations: DecorationSet = prev.decorations
          prev.decorations = decorations
            .map(tr.mapping, tr.doc)
            .add(tr.doc, newDecos)
        } else if (tr.steps.length > 0) {
          prev.decorations = prev.decorations.map(tr.mapping, tr.doc)
          /*
          prev.decorations = getAllChanges(
            upwell,
            baseDraft,
            editableDraft,
            newState.doc
          )
          */
        }
        return prev
      },
    },

    props: {
      decorations(state) {
        let amState = automergeChangesKey.getState(state)
        if (amState.heads) {
          return amState.decorations
        } else {
          return DecorationSet.empty
        }
      },
    },
  })
}
