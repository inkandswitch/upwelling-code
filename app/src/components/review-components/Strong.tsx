import { AttributesOf } from '@atjson/document'
import * as React from 'react'
import { Strong as Annotation } from '../upwell-source'

export const Strong: React.FC<AttributesOf<Annotation>> = (props) => {
  return (
    <b>{props.children}</b>
  )
}
