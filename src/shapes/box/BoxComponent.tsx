import * as React from 'react'
import { TLShapeUtil, SVGContainer } from '@tldraw/core'
import type { BoxShape } from './BoxShape'

export const BoxComponent = TLShapeUtil.Component<BoxShape, SVGSVGElement>(
  ({ shape, events, meta }, ref) => {
    const color = shape.isLocked ? 'orange' : 'black'

    return (
      <SVGContainer ref={ref} {...events}>
        <rect
          width={shape.size[0]}
          height={shape.size[1]}
          stroke={color}
          strokeWidth={3}
          strokeLinejoin="round"
          fill="none"
          rx={4}
          pointerEvents="all"
        />
      </SVGContainer>
    )
  }
)
