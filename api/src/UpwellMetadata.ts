import * as Automerge from "automerge-wasm-pack"
import debug from "debug"

const ROOT = "_root"

export class UpwellMetadata {
  doc: Automerge.Automerge

  constructor(doc: Automerge.Automerge) {
    if (!doc) throw new Error('doc required')
    this.doc = doc
  }

  static load(binary: Uint8Array): UpwellMetadata {
    return new UpwellMetadata(Automerge.loadDoc(binary))
  }

  static create(id: string, main_id: string): UpwellMetadata {
    debug(`creating metadata ${id}  ${main_id}`)
    let doc = Automerge.create()
    doc.set(ROOT, 'id', id) 
    doc.set(ROOT, 'main_id', main_id)
    return new UpwellMetadata(doc)
  }

  get id(): string {
    let value = this.doc.value(ROOT, 'id')
    if (value) return value[1] as string
    else return ''
  }

  get main(): string {
    let value = this.doc.value(ROOT, 'main_id')
    if (value) return value[1] as string
    else return ''
  }

  set main (id: string) {
    this.doc.set(ROOT, 'main_id', id)
  }

}
