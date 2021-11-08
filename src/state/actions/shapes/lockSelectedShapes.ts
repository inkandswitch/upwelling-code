import type { Action } from 'state/constants'

export const lockSelectedShapes: Action = (data) => {
  const { page, pageState } = data
  pageState.selectedIds.forEach((id) => page.shapes[id].isLocked = !page.shapes[id].isLocked)
}
