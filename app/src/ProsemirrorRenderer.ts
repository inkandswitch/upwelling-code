import { Annotation } from '@atjson/document'
import Renderer, { Context } from '@atjson/renderer-hir'
import { schema } from './upwell-pm-schema'

export default class ProsemirrorRenderer extends Renderer {
  *root(): any {
    return schema.node('doc', undefined, yield)
  }

  *renderAnnotation(
    annotation: Annotation<any>,
    context: Context
  ): Iterator<void, any, any> {
    let annotationChildren = (yield).map((c: any) => {
      if (typeof c === 'string') return schema.text(c)
      else return c
    })

    if (annotation.type === 'strong' || annotation.type === 'em') {
      return annotationChildren.map((c: any) => {
        return c.mark([schema.mark(annotation.type)])
      })
    } else if (annotation.type === 'comment') {
      return annotationChildren.map((c: any) => {
        // FIXME this is broken because prosemirror never mutates marks after
        // creation; the mark needs to be removed and re-added if the color
        // changes. The most efficient way to do this is to use an "color-${authorid}"
        // class and just handle it in CSS, but the author id comes in at the
        // same time as the author color, so this doesn't help.
        return c.mark([
          schema.mark('comment', {
            id: annotation.id,
            class: `bg-${annotation.attributes.authorid}`,
            authorColor: annotation.attributes.authorColor,
          }),
        ])
      })
    } else {
      if (annotationChildren.length === 0) annotationChildren = schema.text(' ')

      return schema.node(
        annotation.type,
        annotation.attributes,
        annotationChildren
      )
    }
  }
}
