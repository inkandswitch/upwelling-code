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
    authorColor: { default: 'green' },
  },
  inclusive: false,
  toDOM(node: any) {
    console.log('node attrs?', node.attrs)
    let { id, authorColor } = node.attrs
    let style = `background-color: ${authorColor}`
    return ['span', { id, style }, 0]
  },
}

export const marks = {
  em: basicMarks.em,
  strong: basicMarks.strong,
  comment,
}

export const schema = new Schema({ nodes, marks })
