import { nanoid } from 'nanoid';
import { sia, desia } from 'sializer';
import * as Automerge from 'automerge-wasm';

const ROOT = '_root'

export type ChangeOptions = {
  author: string
}
export type Heads = string[];

export type Subscriber = (doc: UpwellingDoc) => void 

export class UpwellingDoc {
  doc: Automerge.Automerge
  heads?: Heads;
  textObj?: Automerge.ObjID 
  subscriber?: Subscriber 

  constructor(doc: Automerge.Automerge) {
    this.doc = doc
    console.log('getting text')
    let value = this.doc.value(ROOT, 'text')
    console.log('got vvalue', value)
    if (value && value[0] === 'text') {
      this.textObj = value[1]
    } 
  }

  private _getValue(prop: string) {
    return this.doc.value(ROOT, prop, this.heads)![1]
  }

  get version () {
    return this._getValue('version') as string;
  }

  get meta() {
    return {
      version: this.version,
      id: this.id,
      author: this.author,
      message: this.message,
      title: this.title,
    }
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

  set title(value: string) {
    this.doc.set(ROOT, 'title', value, 'str')
  }

  checkout(heads?: Heads) {
    this.heads = heads
  }

  toJSON() : UpwellingDocMetadata {
    return {
      id: this.id,
      message: this.message,
      author: this.author,
      version: this.version,
      text: this.text,
      title: this.title
    }
  }

  subscribe(subscriber: Subscriber) {
    this.subscriber = subscriber  
  }


  getEdits(other: UpwellingDoc): void {
    let changes = this.doc.getChangesAdded(other.doc)
    let decodedChanges: Automerge.DecodedChange[] = changes.map(change => Automerge.decodeChange(change))
  }


  insertAt(position: number, value: string) {
    if (!this.textObj) throw new Error('Text field not properly initialized')
    console.log('inserting', position, value)
    this.doc.splice(this.textObj, position, 0, value)
  }

  deleteAt(position: number) {
    if (!this.textObj) throw new Error('Text field not properly initialized')
    console.log('delition', position)
    this.doc.splice(this.textObj, position, 1, '')
  }

  mark(range: string, value: Automerge.Value) {
    if (!this.textObj) throw new Error('Text field not properly initialized')
    this.doc.mark(ROOT, this.textObj, range, value)
  }

  save (): Uint8Array {
    return this.doc.save()
  }

  static load(binary: Uint8Array): UpwellingDoc {
    let doc = Automerge.loadDoc(binary)
    return new UpwellingDoc(doc)
  }

  static create(id: string): UpwellingDoc {
    let doc = Automerge.create()
    console.log('setting id')
    doc.set(ROOT, 'id', id)
    console.log('setting version')
    doc.set(ROOT, 'version', nanoid())
    console.log('setting message')
    doc.set(ROOT, 'message', 'Document initialized')
    console.log('setting author')
    doc.set(ROOT, 'author', 'Unknown')
    console.log('setting title')
    doc.set(ROOT, 'title', 'Untitled Document')
    console.log('setting text')
    doc.make(ROOT, 'text', Automerge.TEXT)
    return new UpwellingDoc(doc)
  }

  /*
  getVersionHistory(): DocFields[] {
    let history = this.doc.getChanges()
    let last = history[0].snapshot
    let res = [last]
    for (let i = 1; i < history.length; i++) {
      let snapshot = history[i].snapshot
      if (snapshot.version.id !== last.version.id) {
        res.push(snapshot)
      }
      last = snapshot
    }
    return res
  }
  */

  createVersion(message: string, author: string): Heads {
    this.doc.set(ROOT, 'version', nanoid())
    this.doc.set(ROOT, 'message', message)
    this.doc.set(ROOT, 'author', author)
    let metadata = JSON.stringify({ message, author } )
    return this.doc.commit(metadata)
  }

  sync(theirs: UpwellingDoc) {
    let changes = theirs.doc.getChanges(this.doc.getHeads())
    this.doc.applyChanges(changes)
  }
}

export class UpwellingDocMetadata {
  title: string
  id: string
  author: string
  text?: string
  message: string
  version: string

  constructor() {
    throw new Error('New instances of this class should not be created. Use static methods.')
  }

  static deserialize(payload: Uint8Array): UpwellingDocMetadata {
    return desia(payload)
  }

  static serialize(meta: UpwellingDocMetadata): Uint8Array {
    return sia({
      version: meta.version,
      title: meta.title,
      id: meta.id,
      message: meta.message,
      author: meta.author
    })
  }
}
