import { TLBoundsCorner, TLPointerInfo } from '@tldraw/core'
import { shapeUtils } from 'shapes'
import type { Action } from 'state/constants'
import { getPagePoint } from 'state/helpers'
import { mutables } from 'state/mutables'

export const createBoxShape: Action = (data, payload: TLPointerInfo) => {
  console.log('box created?')
  const shape = shapeUtils.box.getShape({
    parentId: 'page1',
    point: getPagePoint(payload.point, data.pageState),
    size: [10, 10],
    childIndex: Object.values(data.page.shapes).length,
  })

  data.page.shapes[shape.id] = shape
  data.pageState.selectedIds = [shape.id]

  mutables.pointedBoundsHandleId = TLBoundsCorner.BottomRight
}
