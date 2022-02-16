import * as Automerge from "automerge-wasm"
import debug from "debug"

const ROOT = "_root"

export class UpwellMetadata {
  doc: Automerge.Automerge

  constructor(doc: Automerge.Automerge) {
    this.doc = doc
  }

  static load(binary: Uint8Array): UpwellMetadata {
    return new UpwellMetadata(Automerge.loadDoc(binary))
  }

  static create(id: string, main_id: string): UpwellMetadata {
    debug("creating metadata", id, main_id)
    let doc = Automerge.create()
    doc.set(ROOT, 'id', id) 
    doc.set(ROOT, 'main_id', main_id)
    return new UpwellMetadata(doc)
  }

  get id(): string {
    return this.doc.value(ROOT, 'id')[1] as string
  }

  get main(): string {
    return this.doc.value(ROOT, 'main_id')[1] as string
  }

  set main (id: string) {
    this.doc.set(ROOT, 'main_id', id)
  }

}