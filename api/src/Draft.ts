import { nanoid } from 'nanoid'
import init, {
  Automerge,
  load,
  create,
  Value,
  Heads,
} from 'automerge-wasm-pack'
import { Upwell, Author, AuthorId } from './Upwell'
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

export type DraftMetadata = {
  id: string
  heads: string[]
  initialHeads: string[]
  contributors: string[]
  title: string
  text: string
  time: number
  marks: any
  comments: any
  shared: boolean
  edited_at: number
  merged_at: number
  parent_id: string
  authorId: AuthorId
  message: string
}

export type Subscriber = (doc: Draft) => void

export class LazyDraft {
  binary: Buffer
  id: string
  constructor(id: string, binary: Buffer) {
    this.binary = binary
    this.id = id
  }

  hydrate() {
    return new Draft(this.id, load(this.binary))
  }
}

export class Draft {
  id: string
  doc: Automerge
  comments: Comments
  _heads?: Heads = []
  _textCache?: string
  subscriber: Subscriber = () => { }

  constructor(id: string, doc: Automerge, heads?: Heads) {
    this.id = id
    this.doc = doc
    this.comments = new Comments(doc, 'comments')
    this._heads = heads
  }

  private _getAutomergeText(prop: string): string {
    if (this._textCache) return this._textCache
    let value = this.doc.get(ROOT, prop, this._heads)
    if (value && value[0] === 'text') {
      this._textCache = this.doc.text(value[1], this._heads)
      return this._textCache
    } else return ''
  }

  _getValue(prop: string, heads?: string[]) {
    let value = this.doc.get(ROOT, prop, heads || this._heads)
    if (value && value[0]) return value[1]
  }

  get initialHeads() {
    let initialHeads = this._getValue('initialHeads') as string
    if (initialHeads) return initialHeads.split(',')
    else return this.doc.getHeads()
  }

  get shared() {
    return this._getValue('shared') as boolean
  }

  get contributors(): string[] {
    let contribMap = this.doc.materialize('/contributors')
    return Object.keys(contribMap)
  }

  set shared(value: boolean) {
    this.doc.put(ROOT, 'shared', value)
  }

  get created_at(): number {
    return this._getValue('time') as number
  }

  set created_at(value: number) {
    this.doc.put(ROOT, 'time', value)
  }

  get edited_at(): number {
    return this._getValue('edited_at') as number
  }

  set edited_at(value: number) {
    this.doc.put(ROOT, 'edited_at', value)
  }

  get merged_at(): number {
    return this._getValue('merged_at') as number
  }

  set merged_at(value: number) {
    this.doc.put(ROOT, 'merged_at', value)
  }

  get message(): string {
    let msg = this._getValue('message') as string
    if (msg.startsWith(Upwell.SPECIAL_UNNAMED_SLUG)) return 'Untitled draft'
    else return msg
  }

  set message(value: string) {
    this.doc.put(ROOT, 'message', value)
  }

  get text(): string {
    return this._getAutomergeText('text')
  }

  get authorId(): AuthorId {
    return this._getValue('author') as AuthorId
  }

  set title(value: string) {
    this.doc.put(ROOT, 'title', value)
  }

  get title(): string {
    return this._getValue('title') as string
  }

  get parent_id(): string {
    return this._getValue('parent_id') as string
  }

  set parent_id(value: string) {
    this.doc.put(ROOT, 'parent_id', value)
  }

  subscribe(subscriber: Subscriber) {
    this.subscriber = subscriber
  }

  checkout(heads: Heads) {
    return new Draft(this.id, this.doc.clone(), heads)
  }

  materialize(heads?: Heads): DraftMetadata {
    if (heads) {
      let draft = this.checkout(heads)
      return draft.materialize()
    }
    return {
      id: this.id,
      title: this.title,
      heads: heads || this.doc.getHeads(),
      initialHeads: this.initialHeads,
      parent_id: this.parent_id,
      text: this.text,
      contributors: this.contributors,
      message: this.message,
      time: this.created_at,
      edited_at: this.edited_at,
      merged_at: this.merged_at,
      shared: this.shared,
      marks: this.marks,
      comments: this.comments.objects(),
      authorId: this.authorId,
    }
  }

  insertAt(position: number, value: string | Array<string>, prop = 'text') {
    let obj = this.doc.get(ROOT, prop)
    if (obj && obj[0] === 'text') {
      delete this._textCache
      return this.doc.splice(obj[1], position, 0, value)
    } else throw new Error('Text field not properly initialized')
  }

  insertBlock(position: number, type: string, attributes: any = {}) {
    let text = this.doc.get(ROOT, 'text')
    let block = { type }
    // This is a weird hack and I don't really understand why setting
    // sub-objects doesn't work in automerge
    Object.keys(attributes).forEach((key) => {
      block[`attribute-${key}`] = attributes[key]
    })
    if (text && text[0] === 'text') {
      delete this._textCache
      let obj = this.doc.insertObject(text[1], position, block)
    } else throw new Error('text not properly initialized')
  }

  getBlock(position: number) {
    let text = this.doc.get(ROOT, 'text')
    if (!text || text[0] !== 'text')
      throw new Error('text not properly initialized')
    let blockObj = this.doc.get(text[1], position)
    if (blockObj && blockObj[0] === 'map') {
      let block = this.doc.materialize(blockObj[1])
      block.attributes = {}
      for (let attr of Object.keys(block)) {
        if (attr.indexOf('attribute-') === 0) {
          block.attributes[attr.substring(10)] = block[attr]
          delete block[attr]
        }
      }
      return block
    }
  }

  setBlock(position: number, type: string, attributes: any) {
    if (!this.getBlock(position))
      throw new Error(
        `unable to modify block, position ${position} is not a block!`
      )
    this.deleteAt(position, 1)
    delete this._textCache
    this.insertBlock(position, type, attributes)
  }

  insertComment(
    from: number,
    to: number,
    message: string,
    authorId: string
  ): string {
    let comment_id = nanoid()
    let comment = {
      id: comment_id,
      author: authorId,
      message,
      children: [],
      state: CommentState.OPEN,
    }

    this.comments.insert(comment)

    this.mark('comment', `[${from}..${to}]`, comment_id)

    return comment_id
  }

  deleteAt(position: number, count: number = 1, prop = 'text') {
    let obj = this.doc.get(ROOT, prop)
    if (obj && obj[0] === 'text') {
      delete this._textCache
      return this.doc.splice(obj[1], position, count, '')
    } else throw new Error('Text field not properly initialized')
  }

  mark(name: string, range: string, value: Value, prop = 'text') {
    let obj = this.doc.get(ROOT, prop)
    if (obj && obj[0] === 'text')
      return this.doc.mark(obj[1], range, name, value)
    else throw new Error('Text field not properly initialized')
  }

  getMarks(prop = 'text') {
    let obj = this.doc.get(ROOT, 'text')
    if (!obj || obj[0] !== 'text')
      throw new Error('Text field not properly initialized')

    let rawSpans = this.doc.raw_spans(obj[1])
    let spanCollector = {
      strong: new Array(this.text.length).fill(false, 0, this.text.length),
      italic: new Array(this.text.length).fill(false, 0, this.text.length),
    }
    let spanActors = {
      strong: new Array(this.text.length),
      italic: new Array(this.text.length),
    }

    let filteredSpans: any[] = []
    for (let span of rawSpans) {
      if (!spanCollector[span.type]) {
        filteredSpans.push(span)
        continue
      }
      spanCollector[span.type].fill(span.value, span.start, span.end)
      spanActors[span.type].fill(span.id, span.start, span.end)
    }

    for (let type of Object.keys(spanCollector)) {
      let spanOffsets = spanCollector[type]
      let idx = 0
      while (true) {
        let start = spanOffsets.indexOf(true, idx)
        if (start === -1) break
        let end = spanOffsets.indexOf(false, start + 1)
        if (end === -1) break
        filteredSpans.push({
          start,
          end,
          type,
          value: true,
          id: spanActors[type][start],
        })
        idx = end + 1
      }
    }

    return filteredSpans
  }

  get marks() {
    return this.getMarks()
  }

  // TODO refactor this to use materialize or whatever because there is some
  // nasty hoop-jumping here.
  get blocks() {
    let blocks: any[] = []

    let i = this.text.indexOf('\uFFFC')

    // If we have an empty document, insert a paragraph to get started.
    if (i === -1) {
      this.insertBlock(0, 'paragraph')
      i = this.text.indexOf('\uFFFC')
    }

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
      let attrs = this.getBlock(i)
      if (!attrs)
        throw new Error(`unable to retrieve block information at position ${i}`)
      let block = { start, end, ...attrs }
      blocks.push(block)
      i = end
    }

    return blocks
  }

  save(): Uint8Array {
    return this.doc.save()
  }

  fork(message: string, author: Author): Draft {
    let id = nanoid()
    let doc = this.doc.fork(Draft.getActorId(author.id))
    doc.put(ROOT, 'initialHeads', this.doc.getHeads().join(','))
    doc.put(ROOT, 'message', message)
    let authorId = author.id.toString()
    doc.put(ROOT, 'author', authorId)
    doc.put(ROOT, 'shared', false)
    doc.put(ROOT, 'time', Date.now())
    doc.put(ROOT, 'merged_at', false)
    doc.put(ROOT, 'edited_at', Date.now())
    doc.put(ROOT, 'archived', false)
    doc.putObject(ROOT, 'comments', {})
    doc.putObject(ROOT, 'contributors', {})
    doc.put(ROOT, 'parent_id', this.id)
    let draft = new Draft(id, doc)
    draft.addContributor(authorId)
    return draft
  }

  addContributor(authorId: AuthorId) {
    let exists = this.doc.get('/contributors', authorId)
    if (exists && exists[0] === 'boolean' && exists[1] === true) return
    this.doc.put('/contributors', authorId, true)
  }

  merge(theirs: Draft): string[] {
    let opIds = this.doc.merge(theirs.doc)
    if (this.subscriber) this.subscriber(this)
    return opIds
  }

  static getActorId(authorId: AuthorId) {
    return authorId + '0000' + createAuthorId()
  }

  static load(id: string, binary: Uint8Array, authorId: AuthorId): Draft {
    let doc = load(binary, this.getActorId(authorId))
    let draft = new Draft(id, doc)
    return draft
  }

  static create(message: string, authorId: AuthorId): Draft {
    let doc = create(this.getActorId(authorId))
    let id = nanoid()
    doc.put(ROOT, 'message', message)
    doc.put(ROOT, 'author', authorId)
    doc.put(ROOT, 'shared', false, 'boolean')
    doc.put(ROOT, 'pinned', false)
    doc.put(ROOT, 'parent_id', id)
    doc.put(ROOT, 'time', Date.now(), 'timestamp')
    doc.put(ROOT, 'archived', false, 'boolean')
    doc.put(ROOT, 'title', '')
    doc.putObject(ROOT, 'comments', {})
    doc.putObject(ROOT, 'contributors', {})
    let text = doc.putObject(ROOT, 'text', '')
    let draft = new Draft(id, doc)
    draft.addContributor(authorId)
    return draft
  }

  commit(message: string): Heads {
    let meta: ChangeMetadata = { authorId: this.authorId, message }
    let heads = this.doc.commit(JSON.stringify(meta))
    if (this.subscriber) this.subscriber(this)
    return [heads]
  }
}
