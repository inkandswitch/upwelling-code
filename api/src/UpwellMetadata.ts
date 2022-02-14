import { nanoid } from "nanoid"
import * as Automerge from "automerge-wasm-pack"
import { Author } from "./Upwell"

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
    doc.set(ROOT, 'main_id', main_id)
    let upwell = new UpwellMetadata(doc)
    return upwell
  }

  get main(): string {
    return this.doc.value(ROOT, 'main_id')[1] as string
  }
  set main (id: string) {
    this.doc.set(ROOT, 'main_id', id)
  }

}