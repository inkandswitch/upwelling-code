import type { Action } from 'state/constants'
import * as Automerge from 'automerge';

export const deleteBindings: Action = (data, payload: { ids: string[] }) => {
  try {
    payload.ids.forEach((id, i) => {
      Object.assign(data, Automerge.change(data, data => delete data.page.bindings[id]))
    })
  } catch (e: any) {
    e.message = 'Could not delete bindings: ' + e.message
    console.error(e)
  }
}
