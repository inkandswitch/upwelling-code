import { Annotation } from '@atjson/document'
import Renderer, { Context } from '@atjson/renderer-hir'
import { schema } from './upwell-pm-schema'

export default class ProsemirrorRenderer extends Renderer {
  *root(): any {
    let inside = yield
    console.log(inside)
    let doc = schema.node('doc', undefined, inside)
    return doc
  }

  *renderAnnotation(
    annotation: Annotation<any>,
    context: Context
  ): Iterator<void, any, any> {
    let annotationChildren = (yield).map((c: any) => {
      if (typeof c === 'string') return schema.text(c)
      else return c
    })

    if (annotationChildren.length === 0) annotationChildren = schema.text(' ')

    return schema.node(
      annotation.type,
      annotation.attributes,
      annotationChildren
    )
  }
}
