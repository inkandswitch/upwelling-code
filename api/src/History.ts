import { DraftId, Upwell } from './Upwell';

export default class History {
  upwell: Upwell
  list: Array<DraftId>

  constructor(upwell: Upwell) {
    this.upwell = upwell
    // Remove the first document which is the root Draft.
    this.list = upwell.metadata.doc.materialize('/history').reverse().slice(1)
  }

  get length() {
    return this.list.length
  }

  get(index: number) {
    let id = this.list[index]
    let buf = this.upwell._archived.get(id)
    if (!buf) return undefined
    else return this.upwell._coerceDraft(id, buf)
  }
}