import { LayerId, Upwell } from './Upwell';

export default class History {
  upwell: Upwell
  list: Array<LayerId>

  constructor(upwell: Upwell) {
    this.upwell = upwell
    this.list = upwell.metadata.doc.materialize('/archived').reverse()
  }

  length() {
    return this.list.length
  }
  
  get(index: number) {
    let id = this.list[index]
    let buf = this.upwell._archived.get(id)
    if (!buf) return undefined
    else return this.upwell._coerceLayer(id, buf)
  }
}