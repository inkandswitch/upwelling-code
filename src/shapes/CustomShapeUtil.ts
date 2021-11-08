import { TLBounds, TLShape, TLShapeUtil } from '@tldraw/core'

export abstract class CustomShapeUtil<
  T extends TLShape,
  E extends Element = Element
> extends TLShapeUtil<T, E> {
  /* ----------------- Custom Methods ----------------- */

  canBind = false

  abstract getCenter: (shape: T) => number[]

  abstract getShape: (shape: Partial<T>) => T

  abstract transform: (shape: T, bounds: TLBounds, initialShape: T, scale: number[]) => void

  abstract lock: (shape: T) => void
}
