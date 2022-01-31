import { Doc } from 'automerge';
import * as Automerge from 'automerge-wasm';
import { nanoid } from 'nanoid';

export type DocFields = {
  root: string 
  version: {
    id: string,
    message: string
  },
  text: string
  title: string
}

export type ChangeOptions = {
  author: string
}

export type Subscriber = (doc: DocFields) => void 

export class UpwellingDoc {
  doc: Automerge.Automerge
  observer?: Subscriber 
  _root: string = '_root'

  constructor(doc: Automerge.Automerge) {
    this.doc = doc
  }

  get root () {
    return this.doc.value(this._root, 'root')
  }

  get version () {
    return this.doc.value(this._root, 'version')
  }

  get text () {
    return this.doc.text('text')
  }

  get title () {
    return this.doc.value(this._root, 'title') 
  }

  view() {
    return {
      version: this.version,
      root: this.root,
      text: this.text,
      title: this.title
    }
  }

  subscribe(onChange: Subscriber) {
    this.observer = onChange
  }

  setTitle(value: string) {
    this.doc.set(this._root, 'title', value, 'string')
  }

  insertAt(position: number, value: string) {
    this.doc.splice('text', position, 0, value)
  }

  save (): Uint8Array {
    return this.doc.save()
  }

  static load(binary: Uint8Array): UpwellingDoc {
    let doc = Automerge.loadDoc(binary)
    return new UpwellingDoc(doc)
  }

  static create(id: string, title?: string): UpwellingDoc {
    let doc = Automerge.create()
    let ROOT = '_root'
    doc.set(ROOT, 'id', id)
    doc.set(ROOT, 'version', {
      id: nanoid(),
      message: 'Document initialized'
    })
    doc.set(ROOT, 'title', Automerge.TEXT)
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

  createVersion(message: string): void {
    this.doc.set(this._root, 'version', {
      id: nanoid(),
      message
    })
  }

  sync(theirs: UpwellingDoc) {
    let changes = theirs.doc.getChanges(this.doc.getHeads())
    this.doc.applyChanges(changes)
  }
}
