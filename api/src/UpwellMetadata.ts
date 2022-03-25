import * as Automerge from "automerge-wasm-pack"
import { Author, AuthorId } from "."
import debug from "debug"

const ROOT = '_root'

export class UpwellMetadata {
  doc: Automerge.Automerge

  constructor(doc: Automerge.Automerge) {
    if (!doc) throw new Error('doc required')
    this.doc = doc
  }

  static load(binary: Uint8Array): UpwellMetadata {
    return new UpwellMetadata(Automerge.loadDoc(binary))
  }

  static create(id: string, main_id: string, author: Author): UpwellMetadata {
    debug(`creating metadata ${id}  ${main_id}`)
    let doc = Automerge.create()
    doc.set(ROOT, 'id', id)
    doc.set_object(ROOT, 'drafts', {})
    doc.set_object(ROOT, 'history', [])
    doc.set_object(ROOT, 'authors', {})
    let meta = new UpwellMetadata(doc)
    meta.main = main_id
    meta.addAuthor(author)
    return meta
  }

  isArchived(id: string): boolean {
    let draft = this.doc.materialize('/drafts/' + id)
    return draft.archived
  }

  archive(id: string) {
    let draft = this.doc.materialize('/drafts/' + id)
    this.doc.set_object('/drafts', id, { ...draft, archived: true })
  }

  addAuthor(author: Author) {
    this.doc.set_object('/authors', author.id, author)
  }

  getAuthors() {
    return this.doc.materialize('/authors')
  }

  getAuthor(authorId: AuthorId): Author | undefined {
    return this.doc.materialize('/authors/' + authorId)
  }

  get id(): string {
    let value = this.doc.value(ROOT, 'id')
    if (value) return value[1] as string
    else return ''
  }

  get main(): string {
    let len = this.doc.length('/history')
    let value = this.doc.value('/history', len - 1)
    if (value && value[0] == 'str') return value[1]
    throw new Error('History value not a string')
  }

  set main(id: string) {
    let len = this.doc.length('/history')
    this.doc.insert('/history', len, id)
    this.archive(id)
  }
}
