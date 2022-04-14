import { Schema, MarkSpec } from 'prosemirror-model'
import {
  nodes as basicNodes,
  marks as basicMarks,
} from 'prosemirror-schema-basic'
import { tokens } from '../colors'

export const nodes = {
  doc: basicNodes.doc,
  paragraph: basicNodes.paragraph,
  heading: basicNodes.heading,
  text: basicNodes.text,
}

let comment: MarkSpec = {
  attrs: {
    id: {},
    authorColor: {},
    message: {},
    author: {},
  },
  inclusive: false,
  toDOM(node: any) {
    let { id, class: cssClass } = node.attrs
    let style = `border-bottom: 3px solid ${tokens.gold}`
    return ['span', { id, style, class: cssClass }, 0]
  },
}

export const marks = {
  em: basicMarks.em,
  strong: basicMarks.strong,
  comment,
}

export const schema = new Schema({ nodes, marks })
