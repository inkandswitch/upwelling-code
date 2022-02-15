import { nanoid } from 'nanoid';
import init from 'automerge-wasm-pack'
import * as Automerge from 'automerge-wasm-pack';
import { Author } from './Upwell';

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
  shared: boolean;
  parent_id: string,
  author: Author,
  message: string,
  archived: boolean
}
export type Subscriber = (doc: Layer, heads: Heads) => void 

export class Layer {
  visible: boolean = false;
  doc: Automerge.Automerge
  private heads?: Heads;
  private subscriber?: Subscriber 

  constructor(doc: Automerge.Automerge) {
    this.doc = doc
  }

  private _getAutomergeText(prop: string): string {
    let value = this.doc.value(ROOT, prop)
    if (value && value[0] === 'text') return this.doc.text(value[1])
    else return ''
  }

  private _getValue(prop: string) {
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

  get id (): string {
    return this._getValue('id') as string;
  }

  set id (value: string) {
    this.doc.set(ROOT, 'id', value)
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

  getEdits(other: Layer): void {
    let changes = this.doc.getChangesAdded(other.doc)
    let decodedChanges: Automerge.DecodedChange[] = changes.map(change => Automerge.decodeChange(change))
    decodedChanges.map((value: Automerge.DecodedChange) => {
    })
  }

  insertAt(position: number, value: string | Array<string>, prop = 'text') {
    let obj = this.doc.value(ROOT, prop)
    if (obj && obj[0] === 'text') return this.doc.splice(obj[1], position, 0, value)
    else throw new Error('Text field not properly initialized')
  }

  deleteAt(position: number, prop = 'text') {
    let obj = this.doc.value(ROOT, prop)
    if (obj && obj[0] === 'text') return this.doc.splice(obj[1], position, 1, '')
    else throw new Error('Text field not properly initialized')
  }

  mark(name: string, range: string, value: Automerge.Value, prop = 'text') {
    let obj = this.doc.value(ROOT, prop)
    if (obj && obj[0] === 'text') return this.doc.mark(obj[1], name, range, value)
    else throw new Error('Text field not properly initialized')
  }

  save (): Uint8Array {
    return this.doc.save()
  }

  clone(): Layer {
    let newDoc = this.doc.clone()
    return new Layer(newDoc)
  }

  static merge(ours: Layer, theirs: Layer) {
    let changes = theirs.doc.getChanges(ours.doc.getHeads())
    ours.doc.applyChanges(changes)
    return ours
  }

  static load(binary: Uint8Array): Layer {
    let doc = Automerge.loadDoc(binary)
    return new Layer(doc)
  }

  static create(message: string, author: Author, layer?: Layer): Layer {
    if (layer) {
      let doc = layer.doc.fork()
      doc.set(ROOT, 'id', nanoid())
      doc.set(ROOT, 'message', message)
      doc.set(ROOT, 'author', author)
      doc.set(ROOT, 'shared', false)
      doc.set(ROOT, 'archived', false)
      doc.set(ROOT, 'parent_id', layer.id)
      return new Layer(doc)
    } else {
      let doc = Automerge.create()
      doc.set(ROOT, 'id', nanoid())
      doc.set(ROOT, 'message', message)
      doc.set(ROOT, 'author', author)
      doc.set(ROOT, 'shared', false)
      doc.set(ROOT, 'archived', false)
      doc.set(ROOT, 'title', Automerge.TEXT)
      doc.set(ROOT, 'text', Automerge.TEXT)
      return new Layer(doc)
    }
  }

  commit(message: string): Heads {
    let meta: ChangeMetadata = { author: this.author, message }
    let heads = this.doc.commit(JSON.stringify(meta))
    if (this.subscriber) this.subscriber(this, heads)
    return heads
  }
}
