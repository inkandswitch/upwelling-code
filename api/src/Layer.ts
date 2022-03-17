import { nanoid } from 'nanoid'
import init, { Automerge, loadDoc, create, Value, SyncMessage, SyncState } from 'automerge-wasm-pack'
import { Author, AuthorId } from './Upwell'
import { Comments, createAuthorId, CommentState } from '.'

export async function loadForTheFirstTimeLoL() {
  return new Promise<void>((resolve, reject) => {
    init().then(() => {
      resolve()
    })
  })
}

const ROOT = '_root'

export type ChangeMetadata = {
  message: string
  authorId: AuthorId
}

export type Heads = string[]
export type LayerMetadata = {
  shared: boolean
  parent_id: string
  authorId: AuthorId
  message: string
}

export type Subscriber = (doc: Layer) => void

export class LazyLayer {
  binary: Buffer
  id: string
  constructor(id: string, binary: Buffer) {
    this.binary = binary
    this.id = id
  }

  hydrate() {
    return new Layer(this.id, loadDoc(this.binary))
  }
}

export class Layer {
  id: string
  doc: Automerge
  comments: Comments
  private subscriber?: Subscriber

  constructor(id: string, doc: Automerge) {
    this.id = id
    this.doc = doc
    this.comments = new Comments(doc, 'comments')
  }

  private _getAutomergeText(prop: string): string {
    let value = this.doc.value(ROOT, prop)
    if (value && value[0] === 'text') return this.doc.text(value[1])
    else return ''
  }

  private _getValue(prop: string) {
    let value = this.doc.value(ROOT, prop)
    if (value && value[0]) return value[1]
  }

  get shared() {
    return this._getValue('shared') as boolean
  }

  set shared(value: boolean) {
    this.doc.set(ROOT, 'shared', value)
  }

  get version() {
    return this._getValue('version') as string
  }

  set version(value: string) {
    this.doc.set(ROOT, 'version', value)
  }

  get time(): number {
    return this._getValue('time') as number
  }

  set time(value: number) {
    this.doc.set(ROOT, 'time', value)
  }

  get message(): string {
    return this._getValue('message') as string
  }

  set message(value: string) {
    this.doc.set(ROOT, 'message', value)
  }

  get text(): string {
    return this._getAutomergeText('text')
  }

  get authorId(): AuthorId {
    return this._getValue('author') as AuthorId
  }

  get title(): string {
    return this._getAutomergeText('title')
  }

  get parent_id(): string {
    return this._getValue('parent_id') as string
  }

  set parent_id(value: string) {
    this.doc.set(ROOT, 'parent_id', value)
  }

  receiveSyncMessage(state: SyncState, message: SyncMessage) {
    if (this.subscriber) this.subscriber(this)
    this.doc.receiveSyncMessage(state, message)
  }

  subscribe(subscriber: Subscriber) {
    this.subscriber = subscriber
  }

  insertAt(position: number, value: string | Array<string>, prop = 'text') {
    let obj = this.doc.value(ROOT, prop)
    if (obj && obj[0] === 'text') return this.doc.splice(obj[1], position, 0, value)
    else throw new Error('Text field not properly initialized')
  }

  insertBlock(position: number, type: string) {
    let text = this.doc.value(ROOT, 'text')
    if (text && text[0] === 'text') this.doc.insert_object(text[1], position, { type })
    else throw new Error('text not properly initialized')
  }

  insertComment(from: number, to: number, message: string, authorId: string): string {
    let comment_id = nanoid()
    let comment = {
      id: comment_id,
      author: authorId,
      message,
      children: [],
      state: CommentState.OPEN
    }

    this.comments.insert(comment)

    this.mark('comment', `[${from}..${to}]`, comment_id)

    return comment_id
  }

  deleteAt(position: number, count: number = 1, prop = 'text') {
    let obj = this.doc.value(ROOT, prop)
    if (obj && obj[0] === 'text') return this.doc.splice(obj[1], position, count, '')
    else throw new Error('Text field not properly initialized')
  }

  mark(name: string, range: string, value: Value, prop = 'text') {
    let obj = this.doc.value(ROOT, prop)
    if (obj && obj[0] === 'text') return this.doc.mark(obj[1], range, name, value)
    else throw new Error('Text field not properly initialized')
  }

  getMarks(prop = 'text') {
    let obj = this.doc.value(ROOT, 'text')
    if (obj && obj[0] === 'text') return this.doc.raw_spans(obj[1])
    else throw new Error('Text field not properly initialized')
  }

  get marks() {
    return this.getMarks()
  }

  // TODO refactor this to use materialize or whatever because there is some
  // nasty hoop-jumping here.
  get blocks() {
    let blocks: any[] = []
    let text = this.doc.value(ROOT, 'text')
    if (!text || text[0] !== 'text') throw new Error('text not properly initialized')

    let i = this.text.indexOf('\uFFFC')
    while (i !== this.text.length) {
      // don't include the block replacement character, since it's just a marker
      // that the paragraph follows
      let start = i + 1

      // find the next block replacement character; this will be the end of our
      // block (if there isn't a next block, this block ends at the end of the
      // text
      let end = this.text.indexOf('\uFFFC', i + 1)
      if (end === -1) end = this.text.length

      // get the attributes for this block
      let attrsObj = this.doc.value(text[1], i)
      let attrs: any = {}
      if (attrsObj && attrsObj[0] === 'map') attrs = this.doc.materialize(attrsObj[1])
      else throw new Error('block properties not initialized, something has gone very wrong')
      let block = { start, end, ...attrs }
      blocks.push(block)
      i = end
    }

    return blocks
  }

  save(): Uint8Array {
    return this.doc.save()
  }

  fork(message: string, author: Author): Layer {
    let id = nanoid()
    let doc = this.doc.fork()
    doc.set(ROOT, 'message', message)
    doc.set(ROOT, 'author', author.id)
    doc.set(ROOT, 'shared', false)
    doc.set(ROOT, 'time', Date.now())
    doc.set(ROOT, 'archived', false)
    doc.set(ROOT, 'parent_id', this.id)
    return new Layer(id, doc)
  }

  merge(theirs: Layer) {
    this.doc.merge(theirs.doc)
  }

  static mergeWithEdits(author: Author, ours: Layer, ...theirs: Layer[]) {
    // Fork the comparison layer, because we want to create a copy, not modify
    // the original. It might make sense to remove this from here and force the
    // caller to do the fork if this is the behaviour they want in order to
    // parallel Layer.merge() behaviour.
    let newLayer = ours.fork('Merge', author)
    let origHead = newLayer.doc.getHeads()

    // Merge all the passed-in layers to this one.
    theirs.forEach(layer => newLayer.merge(layer))

    // Now do a blame against the heads of the comparison layers.
    let heads = theirs.map(layer => layer.doc.getHeads())

    let obj = newLayer.doc.value(ROOT, 'text')
    if (!obj || obj[0] !== 'text') throw new Error('Text field not properly initialized')

    let blame = newLayer.doc.blame(obj[1], origHead, heads)

    // blame contains an array with an entry for each layer passed in above,
    // with edits (add, del) applied against newLayer's text. Convert those to marks!

    for (let i = 0; i < blame.length; i++) {
      let layer = theirs[i]
      let edits = blame[i]

      edits.add.forEach(edit => {
        let text = newLayer.text.substring(edit.start, edit.end)
        newLayer.mark(
          'insert',
          `(${edit.start}..${edit.end})`,
          JSON.stringify({
            author: layer.authorId,
            text
          })
        )
      })

      edits.del.forEach(edit => {
        newLayer.mark(
          'delete',
          `(${edit.pos}..${edit.pos})`,
          JSON.stringify({
            author: layer.authorId,
            text: edit.val
          })
        )
      })
    }

    newLayer.commit('Merge')

    return newLayer
  }

  static getActorId(authorId: AuthorId) {
    return authorId + '0000' + createAuthorId()
  }

  static load(id: string, binary: Uint8Array, authorId: AuthorId): Layer {
    let doc = loadDoc(binary, this.getActorId(authorId))
    let layer = new Layer(id, doc)
    return layer
  }

  static create(message: string, authorId: AuthorId): Layer {
    let doc = create(this.getActorId(authorId))
    let id = nanoid()
    doc.set(ROOT, 'message', message)
    doc.set(ROOT, 'author', authorId)
    doc.set(ROOT, 'shared', false, 'boolean')
    doc.set(ROOT, 'time', Date.now(), 'timestamp')
    doc.set(ROOT, 'archived', false, 'boolean')
    doc.set_object(ROOT, 'title', '')
    doc.set_object(ROOT, 'comments', {})
    // for prosemirror, we can't have an empty document, so fill some space
    let text = doc.set_object(ROOT, 'text', ' ')
    let initialParagraph = doc.insert_object(text, 0, { type: 'paragraph' })
    doc.set(initialParagraph, 'type', 'paragraph')
    let layer = new Layer(id, doc)
    return layer
  }

  commit(message: string): Heads {
    let meta: ChangeMetadata = { authorId: this.authorId, message }
    let heads = this.doc.commit(JSON.stringify(meta))
    if (this.subscriber) this.subscriber(this)
    return heads
  }
}
