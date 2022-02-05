import { nanoid } from 'nanoid';
import { sia, desia } from 'sializer';
import * as Automerge from 'automerge-wasm';
import { Author } from './Upwell';

const ROOT = '_root'

export type ChangeOptions = {
  author: string
}
export type Heads = string[];
export type LayerMetadata = {
  id: string,
  parent_id: string,
  author: string,
  message: string,
  archived: boolean
}
export type Subscriber = (doc: Layer) => void 

export class Layer {
  doc: Automerge.Automerge
  private heads?: Heads;
  private textObj?: Automerge.ObjID 
  private subscriber?: Subscriber 

  constructor(doc: Automerge.Automerge) {
    this.doc = doc
    let value = this.doc.value(ROOT, 'text')
    if (value && value[0] === 'text') {
      this.textObj = value[1]
    } 
  }

  private _getValue(prop: string) {
    let value = this.doc.value(ROOT, prop, this.heads)
    if (value && value[0]) return value[1]
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

  get text () {
    if (this.textObj) return this.doc.text(this.textObj, this.heads)
    else return ''
  }

  get author(): string {
    return this._getValue('author') as string
  }

  get title (): string {
    return this._getValue('title') as string;
  }

  get parent_id(): string {
    return this._getValue('parent_id') as string
  }

  get archived(): boolean {
    return this._getValue('archived') as boolean
  }

  set title(value: string) {
    this.doc.set(ROOT, 'title', value)
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
      archived: this.archived
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

  insertAt(position: number, value: string) {
    if (!this.textObj) throw new Error('Text field not properly initialized')
    this.doc.splice(this.textObj, position, 0, value)
  }

  deleteAt(position: number) {
    if (!this.textObj) throw new Error('Text field not properly initialized')
    this.doc.splice(this.textObj, position, 1, '')
  }

  mark(range: string, value: Automerge.Value) {
    if (!this.textObj) throw new Error('Text field not properly initialized')
    this.doc.mark(ROOT, this.textObj, range, value)
  }

  save (): Uint8Array {
    return this.doc.save()
  }

  static load(binary: Uint8Array): Layer {
    let doc = Automerge.loadDoc(binary)
    return new Layer(doc)
  }

  static create(message: string, layer?: Layer, author?: Author): Layer {
    if (layer) {
      let doc = layer.doc.clone()
      doc.set(ROOT, 'id', nanoid())
      doc.set(ROOT, 'message', message)
      doc.set(ROOT, 'parent_id', layer.id)
      if (author) doc.set(ROOT, 'author', author)
      return new Layer(doc)
    } else {
      let doc = Automerge.create()
      doc.set(ROOT, 'id', nanoid())
      doc.set(ROOT, 'message', message)
      if (author) doc.set(ROOT, 'author', author)
      doc.make(ROOT, 'title', Automerge.TEXT)
      doc.make(ROOT, 'text', Automerge.TEXT)
      return new Layer(doc)
    }
  }

  commit(message: string): Heads {
    let metadata = JSON.stringify({ message })
    return this.doc.commit(metadata)
  }

  sync(theirs: Layer) {
    let changes = theirs.doc.getChanges(this.doc.getHeads())
    this.doc.applyChanges(changes)
  }
}
