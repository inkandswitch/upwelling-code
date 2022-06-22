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

function getInlineDecoration(from: number, to: number, authorId: string) {
  let color = documents.upwell!.getAuthorColor(authorId)
  return Decoration.inline(
    from,
    to,
    { style: `background: ${getAuthorHighlight(color)}` },
    { author: authorId, type: 'insertion' }
  )
}

function getDeletionDecoration(from: number, to: number, authorId: string) {
  let color = documents.upwell!.getAuthorColor(authorId)
  return Decoration.widget(from, (view, getPos) => {
    let node = document.createElement('span')
    node.style.top = '-7px'
    node.setAttribute('spellcheck', 'false')
    node.innerHTML = '<small>➰</small>'
    node.style.background = getAuthorHighlight(color)
    node.style.position = 'relative'
    node.children[0].setAttribute('style', 'position: absolute')
    return node
  })
}

function getInlineDecorations(
  changeSet: ChangeSet,
  draft: Draft,
  doc: Node,
  decorations: DecorationSet
): DecorationSet {
  changeSet.add.forEach((change) => {
    let { from, to } = automergeToProsemirror(change, draft)
    let authorId = change.actor.slice(0, 32)

    let overlap = decorations.find(
      from,
      to,
      (spec) => spec.author === authorId && spec.type === 'insertion'
    )
    if (overlap.length > 0) {
      if (overlap[0].from < from && overlap[0].to > to) {
        return
      } else if (overlap[0].to === from) {
        let newDeco = getInlineDecoration(overlap[0].from, to, authorId)
        decorations = decorations.remove([overlap[0]]).add(doc, [newDeco])
      } else if (to === overlap[0].from) {
        let newDeco = getInlineDecoration(from, overlap[0].to, authorId)
        decorations = decorations.remove([overlap[0]]).add(doc, [newDeco])
      } else {
      }
    } else {
      let deco = getInlineDecoration(from, to, authorId)
      decorations = decorations.add(doc, [deco])
    }
  })

  changeSet.del.forEach((change) => {
    let start = change.pos
    let end = start
    let { from, to } = automergeToProsemirror({ start, end }, draft)
    let authorId = change.actor.slice(0, 32)

    let overlap = decorations.find(
      from,
      to,
      (spec) => spec.author === authorId && spec.type === 'deletion'
    )
    if (overlap.length > 0) {
      if (overlap[0].from < from && overlap[0].to > to) {
        return
      } else if (overlap[0].to === from || to === overlap[0].from) {
        let newDeco = getDeletionDecoration(overlap[0].from, to, authorId)
        decorations = decorations.remove([overlap[0]]).add(doc, [newDeco])
      } else {
      }
    } else {
      let deco = getDeletionDecoration(from, to, authorId)
      decorations = decorations.add(doc, [deco])
    }
  })

  return decorations
}

function getMarginDecorations(
  changeSet: ChangeSet,
  draft: Draft,
  doc: Node,
  decorations: DecorationSet
): DecorationSet {
  changeSet.add.forEach((change) => {
    let { from, to } = automergeToProsemirror(change, draft)
    if (draft.text[change.start] === '\uFFFC') from += 1
    let deco = Decoration.widget(from, (view, getPos) => {
      let sidebarThing = document.createElement('div')
      sidebarThing.style.position = 'absolute'
      let fromCoords = view.coordsAtPos(from)
      let toCoords = view.coordsAtPos(to)
      sidebarThing.style.height = `${toCoords.bottom - fromCoords.top}px`
      sidebarThing.style.left = `${
        view.dom.clientLeft +
        parseFloat(
          window
            .getComputedStyle(view.dom, null)
            .getPropertyValue('padding-left')
        ) -
        12
      }px`
      sidebarThing.style.width = '3px'
      sidebarThing.style.borderRadius = '3px'
      // keeping this around because it's cool. You can show the change heatmap with author colors:
      // sidebarThing.style.background = documents.upwell!.getAuthorColor(
      // change.actor.slice(0, 32)
      // )
      sidebarThing.style.background = '#0000003E'
      sidebarThing.title = 'changes'
      return sidebarThing
    })
    decorations = decorations.add(doc, [deco])
  })

  return decorations
}

function getOldChanges(
  editableDraft: Draft,
  heads: string[],
  baseDraft: Draft,
  doc: Node,
  decorations: DecorationSet
) {
  let obj = editableDraft.doc.get('_root', 'text', heads)

  if (obj && obj[0] === 'text') {
    if (heads.length > 0) {
      let history = editableDraft.doc.attribute2(obj[1], heads, [
        baseDraft.doc.getHeads(),
      ])

      decorations = getInlineDecorations(
        history[0],
        editableDraft,
        doc,
        decorations
      )
      decorations = getMarginDecorations(
        history[0],
        editableDraft,
        doc,
        decorations
      )
    }
  }
  return decorations
}

function getNewChanges(
  editableDraft: Draft,
  baseDraft: Draft,
  doc: Node,
  decorations: DecorationSet
): DecorationSet {
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
    let after = getInlineDecorations(
      newHistory[0],
      editableDraft,
      doc,
      decorations
    )
    return after
  }
  return decorations
}

function getAllChanges(
  upwell: Upwell,
  baseDraft: Draft,
  draft: Draft,
  doc: Node,
  decorations: DecorationSet
) {
  let { attribution } = upwell.mergeWithEdits(
    { id: draft.authorId, name: '' },
    baseDraft,
    draft
  )
  return getInlineDecorations(attribution[0], draft, doc, decorations)
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
            state.doc,
            DecorationSet.empty
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
          console.log('i have heads', heads)
          prev.heads = automergeChanges.heads

          let decorations = DecorationSet.empty
          decorations = getOldChanges(
            editableDraft,
            heads,
            baseDraft,
            tr.doc,
            decorations
          )
          decorations = getNewChanges(
            editableDraft,
            baseDraft,
            tr.doc,
            decorations
          )

          prev.decorations = decorations
        }

        if (!heads && changeSet) {
          prev.decorations = getInlineDecorations(
            changeSet[0],
            editableDraft,
            tr.doc,
            prev.decorations.map(tr.mapping, tr.doc)
          )
        } else if (tr.steps.length > 0) {
          prev.decorations = prev.decorations.map(tr.mapping, tr.doc)
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
