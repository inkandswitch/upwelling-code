import { nanoid } from 'nanoid';
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
    let value = this.doc.value(ROOT, 'text')
    if (value && value[0] === 'text') {
      this.textObj = value[1]
    } 
  }

  private _getValue(prop: string) {
    return this.doc.value(ROOT, prop, this.heads)![1]
  }

  get root () {
    return this._getValue('root') as string;
  }

  set root (value: string) {
    this.doc.set(ROOT, 'root', value)
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

  get title (): string {
    return this._getValue('title') as string;
  }

  set title(value: string) {
    this.doc.set(ROOT, 'title', value, 'str')
  }

  checkout(heads?: Heads) {
    this.heads = heads
  }

  view() {
    return {
      id: this.id,
      message: this.message,
      root: this.root,
      text: this.text,
      title: this.title
    }
  }

  subscribe(subscriber: Subscriber) {
    this.subscriber = subscriber  
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

  static load(binary: Uint8Array): UpwellingDoc {
    let doc = Automerge.loadDoc(binary)
    return new UpwellingDoc(doc)
  }

  static create(id: string): UpwellingDoc {
    let doc = Automerge.create()
    doc.set(ROOT, 'root', id)
    doc.set(ROOT, 'id', nanoid())
    doc.set(ROOT, 'message', 'Document initialized')
    doc.set(ROOT, 'author', 'Unknown')
    doc.set(ROOT, 'title', 'Untitled Document')
    doc.set(ROOT, 'text', Automerge.TEXT)
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
    this.doc.set(ROOT, 'id', nanoid())
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
