import { Draft } from 'api'
import { EditorState } from 'prosemirror-state'

export const BLOCK_MARKER = '\uFFFC'

export const automergeToProsemirror = (
  step: { start: number; end: number },
  draft: Draft
) => {
  return {
    from: automergeToProsemirrorNumber(step.start, draft),
    to: automergeToProsemirrorNumber(step.end, draft),
  }
}

export const automergeToProsemirrorNumber = (
  position: number,
  draft: Draft
) => {
  // first, count how many paragraphs we have. n.b. that this won't work once/if
  // we have nested blocks.
  let idx = draft.text.indexOf(BLOCK_MARKER)
  let i = 0
  while (idx < position && idx !== -1) {
    idx = draft.text.indexOf(BLOCK_MARKER, idx + 1)
    i++
  }

  // this is how many blocks precede the current one.
  // BtextBmore textBmo^re text after pos
  let automergeBlockCount = i - 1

  // <p>text</p><p>more text</p><p>mo^re text after pos</p>
  let prosemirrorBlockCount = automergeBlockCount * 2

  let diff = prosemirrorBlockCount - automergeBlockCount
  return position + diff
}

export const prosemirrorToAutomergeNumber = (
  position: number,
  state: EditorState
): number => {
  let idx = 0
  let blocks = 0
  let offset = 0
  while (idx < state.doc.content.childCount) {
    let contentNode = state.doc.content.maybeChild(idx)
    if (!contentNode) continue
    let nodeSize = contentNode.nodeSize
    offset += nodeSize

    // handle boundary case of empty nodes
    // there is probably a more elegant way to do this.
    if (offset > position) break
    idx++
    blocks++
  }

  let prosemirrorBlockCount = blocks * 2
  let automergeBlockCount = blocks

  let diff = prosemirrorBlockCount - automergeBlockCount

  return position - diff
}

export const prosemirrorToAutomerge = (
  position: { from: number; to: number },
  draft: Draft,
  state: EditorState
): { start: number; end: number } => {
  return {
    start: prosemirrorToAutomergeNumber(position.from, state),
    end: prosemirrorToAutomergeNumber(position.to, state),
  }
}
