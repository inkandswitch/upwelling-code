import { nanoid } from 'nanoid';
import init from 'automerge-wasm-pack'
import { TEXT, Automerge, loadDoc, create, Value }  from 'automerge-wasm-pack';
import { Author } from './Upwell';
import * as Diff from 'diff';

export async function loadForTheFirstTimeLoL() {
  return new Promise<void>((resolve, reject) => {
    init().then(() => {
      resolve()
    })
  })
}

const ROOT = '_root'

export type ChangeMetadata = {
  message: string,
  author: Author
}
export type Heads = string[];
export type LayerMetadata = {
  id: string,
  shared: boolean,
  parent_id: string,
  author: Author,
  message: string,
  archived: boolean
}
export type Subscriber = (doc: Layer, heads: Heads) => void 

export class Layer {
  id: string = nanoid()
  binary?: Buffer
  doc?: Automerge
  private heads?: Heads;
  private subscriber?: Subscriber 

  constructor(doc?: Automerge) {
    this.doc = doc
  }

  static lazyLoad (id: string, buf: Buffer): Layer {
    let layer = new Layer()
    layer.binary = buf
    layer.id = id
    return layer
  }

  hydrate() {
    if (this.doc) return
    if (!this.binary) throw new Error('can only hydrate from a binary!')
    this.doc = loadDoc(this.binary)
  }

  private _getAutomergeText(prop: string): string {
    this.hydrate()
    let value = this.doc.value(ROOT, prop)
    if (value && value[0] === 'text') return this.doc.text(value[1])
    else return ''
  }

  private _getValue(prop: string) {
    this.hydrate()
    let value = this.doc.value(ROOT, prop, this.heads)
    if (value && value[0]) return value[1]
  }

  get shared () {
    return this._getValue('shared') as boolean;
  }

  set shared (value: boolean) {
    this.doc.set(ROOT, 'shared', value)
  }

  get version () {
    return this._getValue('version') as string;
  }

  set version (value: string) {
    this.doc.set(ROOT, 'version', value)
  }

  get time(): number {
    return this._getValue('time') as number
  }

  set time(value: number){
    this.doc.set(ROOT, 'time', value) 
  }

  get message (): string {
    return this._getValue('message') as string;
  }

  set message(value: string) {
    this.doc.set(ROOT, 'message', value)
  }

  get text (): string {
    return this._getAutomergeText('text')
  }

  get author(): Author {
    return this._getValue('author') as Author
  }

  get title (): string {
    return this._getAutomergeText('title')
  }

  get parent_id(): string {
    return this._getValue('parent_id') as string
  }

  get archived(): boolean {
    return this._getValue('archived') as boolean
  }

  set archived(value: boolean) {
    this.doc.set(ROOT, 'archived', value)
  }

  checkout(heads?: Heads) {
    this.heads = heads
  }

  get metadata() : LayerMetadata {
    return {
      id: this.id,
      message: this.message,
      author: this.author,
      parent_id: this.parent_id,
      archived: this.archived,
      shared: this.shared
    }
  }

  subscribe(subscriber: Subscriber) {
    this.subscriber = subscriber  
  }

  getEdits(other: Layer) {
    this.hydrate()
    let ours = this.text
    let theirs = other.text

    let diffs = Diff.diffWordsWithSpace(ours, theirs)

    let idx = 0
    return diffs.map(d => {
      let type: string

      if (d.added) {
        type = 'insert'
      } else if (d.removed) {
        type = 'delete'
      } else {
        type = 'retain'
      }

      let currIdx = idx
      if (type === 'insert' || type === 'retain') idx = currIdx + d.value.length

      return {
        type,
        start: currIdx,
        value: d.value
      }
    })
  }

  insertAt(position: number, value: string | Array<string>, prop = 'text') {
    this.hydrate()
    let obj = this.doc.value(ROOT, prop)
    if (obj && obj[0] === 'text') return this.doc.splice(obj[1], position, 0, value)
    else throw new Error('Text field not properly initialized')
  }

  deleteAt(position: number, count: number = 1, prop = 'text') {
    this.hydrate()
    let obj = this.doc.value(ROOT, prop)
    if (obj && obj[0] === 'text') return this.doc.splice(obj[1], position, count, '')
    else throw new Error('Text field not properly initialized')
  }

  mark(name: string, range: string, value: Value, prop = 'text') {
    this.hydrate()
    let obj = this.doc.value(ROOT, prop)
    if (obj && obj[0] === 'text') return this.doc.mark(obj[1], range, name, value)
    else throw new Error('Text field not properly initialized')
  }

  getMarks(prop = 'text') {
    this.hydrate()
    let obj = this.doc.value(ROOT, 'text')
    if (obj && obj[0] === 'text') return this.doc.raw_spans(obj[1])
    else throw new Error('Text field not properly initialized')
  }

  get marks () {
    return this.getMarks()
  }

  save (): Uint8Array {
    return this.doc.save()
  }

  fork(message: string, author: Author): Layer {
    this.hydrate()
    let doc = this.doc.fork()
    doc.set(ROOT, 'message', message)
    doc.set(ROOT, 'author', author)
    doc.set(ROOT, 'shared', false)
    doc.set(ROOT, 'time', Date.now())
    doc.set(ROOT, 'archived', false)
    doc.set(ROOT, 'parent_id', this.id)
    return new Layer(doc)
  }

  static merge(ours: Layer, theirs: Layer) {
    ours.hydrate()
    theirs.hydrate()
    let changes = theirs.doc.getChanges(ours.doc.getHeads())
    ours.doc.applyChanges(changes)
    return ours
  }

  static mergeWithEdits(ours: Layer, theirs: Layer) {
    ours.hydrate()
    theirs.hydrate()
    let edits = ours.getEdits(theirs)
    let newLayer = Layer.merge(ours.fork('Merge', ours.author), theirs)

    edits.forEach((edit) => {
      if (edit.type === 'retain') return

      let start = edit.start
      let end: number

      if (edit.type === 'delete') {
        end = edit.start
      } else if (edit.type === 'insert') {
        end = edit.start + edit.value.length
      }

      newLayer.mark(
        edit.type,
        `[${start}..${end}]`,
        JSON.stringify({ // I *really* don't want to do this, but as a quick hack it's not the worst thing I've ever done. Pending a better solution.
          author: theirs.author,
          text: edit.value
        })
      )
    })
    newLayer.commit('Merge')

    return newLayer
  }

  static load(id: string, binary: Uint8Array): Layer {
    let doc = loadDoc(binary)
    let layer = new Layer(doc)
    layer.id = id
    return layer
  }

  static create(message: string, author: Author): Layer {
    let doc = create()
    doc.set(ROOT, 'message', message)
    doc.set(ROOT, 'author', author)
    doc.set(ROOT, 'shared', false)
    doc.set(ROOT, 'time', Date.now())
    doc.set(ROOT, 'archived', false)
    doc.make(ROOT, 'title', TEXT)
    doc.make(ROOT, 'text', TEXT)
    return new Layer(doc)
  }

  commit(message: string): Heads {
    this.hydrate()
    let meta: ChangeMetadata = { author: this.author, message }
    let heads = this.doc.commit(JSON.stringify(meta))
    if (this.subscriber) this.subscriber(this, heads)
    return heads
  }
}
