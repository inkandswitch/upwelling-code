import { LayerId, Upwell } from './Upwell';

export default class History {
  upwell: Upwell
  list: Array<LayerId>

  constructor(upwell: Upwell) {
    this.upwell = upwell
    // Remove the first document which is the root layer.
    this.list = upwell.metadata.doc.materialize('/archived').slice(1).reverse()
  }

  get length() {
    return this.list.length 
  }
  
  get(index: number) {
    let id = this.list[index]
    let buf = this.upwell._archived.get(id)
    if (!buf) return undefined
    else return this.upwell._coerceLayer(id, buf)
  }
}