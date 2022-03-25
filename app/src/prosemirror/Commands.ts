import { MarkType } from 'prosemirror-model'
import { EditorState, Transaction } from 'prosemirror-state'
import { Command, toggleMark } from 'prosemirror-commands'
import { schema } from './UpwellSchema'

export const toggleBold = toggleMarkCommand(schema.marks.strong)
export const toggleItalic = toggleMarkCommand(schema.marks.em)

function toggleMarkCommand(mark: MarkType): Command {
  return (
    state: EditorState,
    dispatch: ((tr: Transaction) => void) | undefined
  ) => {
    return toggleMark(mark)(state, dispatch)
  }
}
