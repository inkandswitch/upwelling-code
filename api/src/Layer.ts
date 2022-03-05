import { nanoid } from 'nanoid';
import init from 'automerge-wasm-pack'
import { Automerge, loadDoc, create, Value }  from 'automerge-wasm-pack';
import { Author } from './Upwell';
import * as Diff from 'diff';

export async function loadForTheFirstTimeLoL() {
  return new Promise<void>((resolve, reject) => {
    init().then(() => {
      resolve()
    })
  })
}

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

export type Edit = {
  type: 'insert' | 'delete' | 'retain',
  start: number,
  value: string
}
export type Subscriber = (doc: Layer, heads: Heads) => void 

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
  private subscriber?: Subscriber 

  constructor(id: string, doc: Automerge) {
    this.id = id
    this.doc = doc
  }

  get shared (): boolean{
    let value = this.doc.value("_root", 'shared');
    if (value && value[0] === 'boolean') return value[1]
    return false 
  }

  set shared (value: boolean) {
    this.doc.set("_root", 'shared', value)
  }

  get time(): number {
    let value = this.doc.value("_root", 'time');
    if (value && value[0] === 'int') return value[1]
    return Date.now()
  }

  set time(value: number){
    this.doc.set("_root", 'time', value) 
  }

  get message (): string {
    let value = this.doc.value("_root", 'message');
    if (value && value[0] === 'str') return value[1]
    return ''
  }

  set message(value: string) {
    this.doc.set("_root", 'message', value)
  }

  get text (): string {
    let value = this.doc.value("_root", 'text');
    if (value && value[0] === 'text') return this.doc.text(value[1])
    return ''
  }

  get author(): Author {
    let value = this.doc.value("_root", 'author');
    if (value && value[0] === 'str') return value[1]
    return ''
  }

  get title (): string {
    let value = this.doc.value("_root", 'title');
    if (value && value[0] === 'text') return this.doc.text(value[1])
    return ''
  }

  get parent_id(): string {
    let value = this.doc.value("_root", 'parent_id');
    if (value && value[0] === 'str') return value[1]
    return ''
  }

  get archived(): boolean {
    let value = this.doc.value("_root", 'archived')
    if (value && value[0] === 'boolean') return value[1]
    else return false
  }

  set archived(value: boolean) {
    this.doc.set("_root", 'archived', value)
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

  getEdits(other: Layer): Edit[] {
    let ours = this.text
    let theirs = other.text

    let diffs = Diff.diffWordsWithSpace(ours, theirs)

    let idx = 0
    return diffs.map(d => {
      let type

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
    let obj = this.doc.value("_root", prop)
    if (obj && obj[0] === 'text') return this.doc.splice(obj[1], position, 0, value)
    else throw new Error('Text field not properly initialized')
  }

  deleteAt(position: number, count: number = 1, prop = 'text') {
    let obj = this.doc.value("_root", prop)
    if (obj && obj[0] === 'text') return this.doc.splice(obj[1], position, count, '')
    else throw new Error('Text field not properly initialized')
  }

  mark(name: string, range: string, value: Value, prop = 'text') {
    let obj = this.doc.value("_root", prop)
    if (obj && obj[0] === 'text') return this.doc.mark(obj[1], range, name, value)
    else throw new Error('Text field not properly initialized')
  }

  getMarks(prop = 'text') {
    let obj = this.doc.value("_root", 'text')
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
    let id = nanoid()
    let doc = this.doc.fork()
    doc.set("_root", 'message', message)
    doc.set("_root", 'author', author)
    doc.set("_root", 'shared', false)
    doc.set("_root", 'time', Date.now())
    doc.set("_root", 'archived', false)
    doc.set("_root", 'parent_id', this.id)
    return new Layer(id, doc)
  }

  merge(theirs: Layer) {
    this.doc.merge(theirs.doc)
  }

  static mergeWithEdits(ours: Layer, theirs: Layer) {
    let edits = ours.getEdits(theirs)
    let newLayer = ours.fork('Merge', ours.author)
    newLayer.merge(theirs)

    edits.forEach((edit) => {
      if (edit.type === 'retain') return

      let start = edit.start
      let end: number

      if (edit.type === 'delete') {
        end = edit.start
      } else if (edit.type === 'insert') {
        end = edit.start + edit.value.length
      } else {
        end = 0  
      }

      /*
      newLayer.mark(
        edit.type,
        `[${start}..${end}]`,
        JSON.stringify({ // I *really* don't want to do this, but as a quick hack it's not the worst thing I've ever done. Pending a better solution.
          author: theirs.author,
          text: edit.value
        })
      )
      */
    })
    newLayer.commit('Merge')

    return newLayer
  }

  static load(id: string, binary: Uint8Array): Layer {
    let doc = loadDoc(binary)
    let layer = new Layer(id, doc)
    return layer
  }

  static create(message: string, author: Author): Layer {
    let doc = create()
    let id = nanoid()
    doc.set("_root", 'message', message)
    doc.set("_root", 'author', author)
    doc.set("_root", 'shared', false, 'boolean')
    doc.set("_root", 'time', Date.now(), 'timestamp')
    doc.set("_root", 'archived', false, 'boolean')
    doc.make("_root", 'title', '')
    doc.make("_root", 'text', '')
    return new Layer(id, doc)
  }

  commit(message: string): Heads {
    let meta: ChangeMetadata = { author: this.author, message }
    let heads = this.doc.commit(JSON.stringify(meta))
    if (this.subscriber) this.subscriber(this, heads)
    return heads
  }
}
