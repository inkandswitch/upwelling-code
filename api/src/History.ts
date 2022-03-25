import { DraftId, Upwell } from './Upwell';

export default class History {
  upwell: Upwell
  list: Array<DraftId>

  constructor(upwell: Upwell) {
    this.upwell = upwell
    // Remove the first document which is the root Draft.
    this.list = upwell.metadata.doc.materialize('/history').reverse()
  }

  get length() {
    return this.list.length
  }

  get(index: number) {
    let id = this.list[index]
    if (id) {
      let { heads } = this.upwell.metadata.getDraft(id)
      let meta = this.upwell.rootDraft.materialize(heads)
      meta.id = id
      return meta
    }
    return undefined
  }
}