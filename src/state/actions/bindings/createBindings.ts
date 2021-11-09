import type { TLBinding } from '@tldraw/core'
import { nanoid } from 'nanoid'
import type { Action, CustomBinding } from 'state/constants'
import * as Automerge from 'automerge';

export const createBindings: Action = (
  data,
  payload: {
    bindings: (Partial<TLBinding> & Pick<CustomBinding, 'fromId' | 'toId' | 'handleId'>)[]
  }
) => {
  payload.bindings.forEach((partial) => {
    const binding = {
      id: nanoid(),
      ...partial,
    }

    let newData = Automerge.change(data, doc => doc.page.bindings[binding.id] = binding)
    Object.assign(data, newData)
  })
}
