import Document from '@atjson/document'
import { InlineAnnotation, BlockAnnotation } from '@atjson/document'

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

export default class UpwellSource extends Document {
  static schema = [Insertion, Deletion, Paragraph]
}
