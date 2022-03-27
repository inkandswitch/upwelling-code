import { DraftId, Upwell } from './Upwell';

export default class History {
  upwell: Upwell
  list: Array<DraftId>

  constructor(upwell: Upwell) {
    this.upwell = upwell
    // Remove the first document which is the root Draft.
    this.list = upwell.doc.materialize('/history').reverse()
  }

  get length() {
    return this.list.length
  }

  get(index: number) {
    let id = this.list[index]
    if (id) return this.upwell.getDraft(id)
    return undefined
  }
}