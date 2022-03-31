import Document from '@atjson/document'
import { InlineAnnotation, BlockAnnotation } from '@atjson/document'
import { Draft, CommentState } from 'api'
import deterministicColor from '../color'

export class Insertion extends InlineAnnotation<{
  author?: string
  authorColor: string
  text: string
}> {
  static vendorPrefix = 'upwell'
  static type = 'insert'
}

export class Deletion extends InlineAnnotation<{
  author?: string
  authorColor: string
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

  // This converts an upwell/automerge draft to an atjson document.
  static fromRaw(draft: Draft) {
    // first convert marks to annotations
    let i = 1
    let annotations: any = []
    draft.marks.forEach((m: any, e: number) => {
      let attrs: any = {}
      if (Array.isArray(m)) {
        if (!m.length) return
        let [type, , value] = m[0]
        if (type === 'strong' || type === 'em') {
          if (!value) return
        } else if (type === 'comment') {
          if (value.state === CommentState.CLOSED) return
          attrs = draft.comments.get(value)
          attrs.authorColor = deterministicColor(attrs.author)
        } else {
          try {
            if (value && value.length > 0) attrs = JSON.parse(value)

            if (type === 'insert' || type === 'delete') {
              attrs['authorColor'] = deterministicColor(attrs.author)
            }
          } catch {
            console.log(
              'we should really fix the thing where I stuffed mark attrs into a json string lol'
            )
          }
        }

        // I wonder if there's a (good) way to preserve the automerge identity of
        // the mark here (id? presumably?) Or I guess just the mark itself?) so
        // that we can do direct actions on the Upwell draft via the atjson annotation
        // as a proxy.
        annotations.push({
          start: i,
          end: draft.marks[e + 1].length + i,
          type: `-upwell-${type}`,
          attributes: attrs,
        })
      } else {
        i += m.length
        return null
      }
    })

    // next convert blocks to annotations
    for (let b of draft.blocks) {
      b.type = `-upwell-${b.type}`
      annotations.push(b)
    }

    return new this({
      content: draft.text,
      annotations,
    })
  }
}
