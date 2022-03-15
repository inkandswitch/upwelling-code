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
}
