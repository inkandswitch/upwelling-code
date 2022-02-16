import { nanoid } from "nanoid"
import * as Automerge from "automerge-wasm"

const ROOT = "_root"

export class UpwellMetadata {
  doc: Automerge.Automerge

  constructor(doc: Automerge.Automerge) {
    this.doc = doc
  }

  static load(binary: Uint8Array): UpwellMetadata {
    return new UpwellMetadata(Automerge.loadDoc(binary))
  }

  static create(main_id: string): UpwellMetadata {
    let doc = Automerge.create()
    doc.set(ROOT, 'id', nanoid())
    doc.set(ROOT, 'main_id', main_id)
    let upwell = new UpwellMetadata(doc)
    return upwell
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