import * as React from 'react'
import { Renderer, TLShapeUtilsMap } from '@tldraw/core'
import { BoxUtil, Shape } from './shapes'
import { useAppState } from './hooks/useAppState'

export const shapeUtils: TLShapeUtilsMap<Shape> = {
  box: new BoxUtil(),
}

export default function App(): JSX.Element {
  const { page, pageState, meta, theme, events } = useAppState()


  return (
    <div className="tldraw">
      <Renderer
        shapeUtils={shapeUtils} // Required
        page={page} // Required
        pageState={pageState} // Required
        {...events}
        meta={meta}
        theme={theme}
        id={undefined}
        containerRef={undefined}
        hideBounds={true}
        hideIndicators={false}
        hideHandles={true}
        hideCloneHandles={true}
        hideBindingHandles={true}
        hideRotateHandles={true}
        userId={undefined}
        users={undefined}
        snapLines={undefined}
        onBoundsChange={undefined}
      />
    </div>
  )
}
