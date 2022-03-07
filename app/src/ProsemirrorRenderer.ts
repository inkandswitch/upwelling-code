import { Annotation } from '@atjson/document'
import Renderer, { Context } from '@atjson/renderer-hir'
import { schema } from './upwell-pm-schema'

export default class ProsemirrorRenderer extends Renderer {
  *root(): any {
    return schema.node('doc', undefined, ...(yield))
  }

  *renderAnnotation(
    annotation: Annotation<any>,
    context: Context
  ): Iterator<void, any, any> {
    const annotationChildren = (yield).map((c: any) => {
      if (typeof c === 'string') return schema.text(c)
      else return c
    })

    return schema.node(
      annotation.type,
      annotation.attributes,
      annotationChildren
    )
  }
}
