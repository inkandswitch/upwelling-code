import { Utils, TLBounds } from '@tldraw/core'
import Vec from '@tldraw/vec'
import { nanoid } from 'nanoid'
import { CustomShapeUtil } from '../CustomShapeUtil'
import { BoxComponent } from './BoxComponent'
import { BoxIndicator } from './BoxIndicator'
import type { BoxShape } from './BoxShape'

type T = BoxShape
type E = SVGSVGElement

export class BoxUtil extends CustomShapeUtil<T, E> {
  Component = BoxComponent

  Indicator = BoxIndicator

  getShape = (props: Partial<T>): T => {
    return {
      id: nanoid(),
      type: 'box',
      name: 'Box',
      parentId: 'page1',
      point: [0, 0],
      size: [100, 100],
      childIndex: 1,
      ...props,
    }
  }

  getBounds = (shape: T) => {
    const bounds = Utils.getFromCache(this.boundsCache, shape, () => {
      const [width, height] = shape.size

      return {
        minX: 0,
        maxX: width,
        minY: 0,
        maxY: height,
        width,
        height,
      } as TLBounds
    })

    return Utils.translateBounds(bounds, shape.point)
  }

  /* ----------------- Custom Methods ----------------- */

  canBind = true

  getCenter = (shape: T) => {
    return Utils.getBoundsCenter(this.getBounds(shape))
  }

  transform = (shape: T, bounds: TLBounds, initialShape: T, scale: number[]) => {
    shape.point = [bounds.minX, bounds.minY]
    shape.size = [bounds.width, bounds.height]
  }
}
