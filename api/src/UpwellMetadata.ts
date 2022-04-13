import * as Automerge from 'automerge-wasm-pack'
import { Draft, Author, AuthorId, DraftMetadata } from '.'
import colors from './colors'

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

  static create(id: string): UpwellMetadata {
    let doc = Automerge.create()
    doc.set(ROOT, 'id', id)
    doc.set_object(ROOT, 'drafts', {})
    doc.set_object(ROOT, 'history', [])
    doc.set_object(ROOT, 'authors', [])
    let meta = new UpwellMetadata(doc)
    return meta
  }

  isArchived(id: string): boolean {
    let draft = this.doc.materialize('/drafts/' + id)
    return draft.archived
  }

  archive(id: string) {
    let draft = this.doc.materialize('/drafts/' + id)
    this.doc.set_object('/drafts', id, {
      id: draft.id,
      heads: draft.heads,
      archived: true,
    })
  }

  addDraft(draft: Draft) {
    let draftMetadata = draft.materialize()
    if (this.isArchived(draft.id))
      throw new Error('Cant update an archived draft')
    this.doc.set_object('/drafts', draft.id, {
      id: draft.id,
      heads: draftMetadata.heads,
      archived: false,
      shared: draft.shared,
    })
  }

  getDraft(id: string): { id: string; heads: string[]; archived: boolean } {
    return this.doc.materialize('/drafts/' + id)
  }

  addAuthor(author: Author) {
    let maybe = this.doc.materialize('/authors')
    if (maybe.findIndex((a) => a.id === author.id) === -1) {
      author.date = Date.now()
      let len = this.doc.length('/authors')
      this.doc.insert_object('/authors', len, author)
    }
  }

  updateAuthor(id: AuthorId, name: string) {
    let maybe = this.doc.materialize('/authors')
    let index = maybe.findIndex((a) => a.id === id)
    let old = maybe[index]
    old.name = name
    this.doc.insert_object('/authors', index, old)
  }

  getAuthors() {
    return this.doc.materialize('/authors')
  }

  getAuthor(authorId: AuthorId): Author | undefined {
    return this.doc.materialize('/authors').find((a) => a.id === authorId)
  }

  getAuthorColor(authorId: AuthorId): string {
    let authors = this.getAuthors()

    let index = authors.findIndex((author) => author.id === authorId)
    return colors[Math.max(index % colors.length, 0)]
  }

  get id(): string {
    let value = this.doc.value(ROOT, 'id')
    if (value) return value[1] as string
    else return ''
  }

  get main(): string {
    let value = this.doc.value(ROOT, 'main')
    if (!value) throw new Error('no main doc')
    return value[1] as string
  }

  set main(id: string) {
    this.doc.set(ROOT, 'main', id)
  }

  addToHistory(id: string) {
    let len = this.doc.length('/history')
    this.doc.insert('/history', len, id)
  }
}
