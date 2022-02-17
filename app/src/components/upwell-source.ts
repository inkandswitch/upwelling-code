import Document from "@atjson/document";
import { InlineAnnotation } from "@atjson/document";

export class Insertion extends InlineAnnotation<{
  author?: string;
  text: string;
}> {
  static vendorPrefix = "upwell";
  static type = "insert";
}

export class Deletion extends InlineAnnotation<{
  author?: string;
  text: string;
}> {
  static vendorPrefix = "upwell";
  static type = "delete";
}

export default class UpwellSource extends Document {
  static schema = [ Insertion, Deletion ];
}
