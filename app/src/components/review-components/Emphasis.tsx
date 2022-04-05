import { AttributesOf } from '@atjson/document'
import * as React from 'react'
import { Emphasis as Annotation } from '../upwell-source'

export const Italic: React.FC<AttributesOf<Annotation>> = (props) => {
  return <em>{props.children}</em>
}
