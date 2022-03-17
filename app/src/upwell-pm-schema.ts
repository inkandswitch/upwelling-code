import { Schema, MarkSpec } from 'prosemirror-model'
import {
  nodes as basicNodes,
  marks as basicMarks,
} from 'prosemirror-schema-basic'

export const nodes = {
  doc: basicNodes.doc,
  paragraph: basicNodes.paragraph,
  text: basicNodes.text,
}

let comment: MarkSpec = {
  attrs: {
    id: {},
    authorColor: { default: 'rgba(0,255,0,0.5)' },
    class: {},
  },
  inclusive: false,
  toDOM(node: any) {
    let { id, authorColor, class: cssClass } = node.attrs
    let style = `background-color: ${authorColor}`
    return ['span', { id, style, class: cssClass }, 0]
  },
}

export const marks = {
  em: basicMarks.em,
  strong: basicMarks.strong,
  comment,
}

export const schema = new Schema({ nodes, marks })
