import * as Automerge from 'automerge-wasm-pack'
import { Draft, Author, AuthorId, DraftMetadata } from '.'

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
    doc.set_object(ROOT, 'authors', {})
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
    })
  }

  getDraft(id: string): { id: string; heads: string[]; archived: boolean } {
    return this.doc.materialize('/drafts/' + id)
  }

  addAuthor(author: Author) {
    let maybe = this.doc.materialize('/authors/' + author.id)
    let shouldUpdate = !maybe || (maybe && maybe.name !== author.name)
    if (shouldUpdate) {
      this.doc.set_object('/authors', author.id, author)
    }
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

  addToHistory(id: string) {
    let len = this.doc.length('/history')
    this.doc.insert('/history', len, id)
    this.archive(id)
  }
}
