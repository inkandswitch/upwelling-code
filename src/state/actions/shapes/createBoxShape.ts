import { TLBoundsCorner, TLPointerInfo } from '@tldraw/core'
import { shapeUtils } from 'shapes'
import type { Action } from 'state/constants'
import { getPagePoint } from 'state/helpers'
import { mutables } from 'state/mutables'
import * as Automerge from 'automerge';

export const createBoxShape: Action = (data, payload: TLPointerInfo) => {
  const shape = shapeUtils.box.getShape({
    parentId: 'page1',
    point: getPagePoint(payload.point, data.pageState),
    size: [100, 100],
    childIndex: Object.values(data.page.shapes).length,
  })
    
  let doc = Automerge.change(data, doc => {
    doc.page.shapes[shape.id] = shape
    doc.pageState.selectedIds = [shape.id]
  })
  Object.assign(data, doc)
  mutables.pointedBoundsHandleId = TLBoundsCorner.BottomRight
}
