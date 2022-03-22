import Document from '@atjson/document'
import { InlineAnnotation, BlockAnnotation } from '@atjson/document'
import { Layer } from 'api'
import { AuthorColorsType } from './ListDocuments'

export class Insertion extends InlineAnnotation<{
  author?: string
  authorColor?: string
  text: string
}> {
  static vendorPrefix = 'upwell'
  static type = 'insert'
}

export class Deletion extends InlineAnnotation<{
  author?: string
  authorColor?: string
  text: string
}> {
  static vendorPrefix = 'upwell'
  static type = 'delete'
}

export class Paragraph extends BlockAnnotation<{}> {
  static vendorPrefix = 'upwell'
  static type = 'paragraph'
}

export class Strong extends InlineAnnotation<{}> {
  static vendorPrefix = 'upwell'
  static type = 'strong'
}

export class Emphasis extends InlineAnnotation<{}> {
  static vendorPrefix = 'upwell'
  static type = 'em'
}

export class Comment extends InlineAnnotation<{}> {
  static vendorPrefix = 'upwell'
  static type = 'comment'
}

export default class UpwellSource extends Document {
  static schema = [Comment, Deletion, Emphasis, Insertion, Paragraph, Strong]

  // This converts an upwell/automerge layer to an atjson document.
  static fromRaw(layer: Layer, colors?: AuthorColorsType) {
    // first convert marks to annotations
    let marks = layer.marks.map((m: any) => {
      let attrs: any = {}
      if (m.type === 'comment') {
        attrs = layer.comments.get(m.value)
        if (colors) attrs.authorColor = colors[attrs.author]
      } else {
        try {
          if (m.value && m.value.length > 0) attrs = JSON.parse(m.value)

          if (m.type === 'insert' || m.type === 'delete') {
            if (colors) attrs['authorColor'] = colors[attrs.author]
          }
        } catch {
          console.log(
            'we should really fix the thing where I stuffed mark attrs into a json string lol'
          )
        }
      }

      // I wonder if there's a (good) way to preserve the automerge identity of
      // the mark here (id? presumably?) Or I guess just the mark itself?) so
      // that we can do direct actions on the Upwell layer via the atjson annotation
      // as a proxy.
      return {
        start: m.start,
        end: m.end,
        type: `-upwell-${m.type}`,
        attributes: attrs,
      }
    })

    // next convert blocks to annotations
    for (let b of layer.blocks) {
      b.type = `-upwell-${b.type}`
      marks.push(b)
    }

    return new this({
      content: layer.text,
      annotations: marks,
    })
  }
}
