import { nanoid } from "nanoid"
import * as Automerge from "automerge-wasm"
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

  static create(main_id: string, author?: Author): UpwellMetadata {
    let doc = Automerge.create()
    doc.set(ROOT, 'main_id', main_id)
    doc.set(ROOT, 'authors', Automerge.MAP)
    let upwell = new UpwellMetadata(doc)
    if (author) upwell.addAuthor(author)
    return upwell
  }

  get main(): string {
    return this.doc.value(ROOT, 'main_id')[1] as string
  }
  set main (id: string) {
    this.doc.set(ROOT, 'main_id', id)
  }

  addAuthor(author: Author) {
    let doc = this.doc
    let authors = doc.value(ROOT, 'authors')
    if (authors[0] === 'map') {
      let author_prop = doc.set(authors[1], author.id, Automerge.MAP)
      doc.set(author_prop, 'handle', author.handle)
      doc.set(author_prop, 'id', author.id)
    } else { 
      throw new Error('Authors prop not properly initialized, that should never happen.')
    }
  }

}