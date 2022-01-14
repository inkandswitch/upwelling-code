import * as Automerge from 'automerge';
import { nanoid } from 'nanoid';

export interface DocFields  {
  root: string 
  id: string 
  text: Automerge.Text
  title: Automerge.Text
}

export type Subscriber = (doc: DocFields) => void 

export class UpwellingDoc {
  doc: Automerge.Doc<DocFields>
  observer: Automerge.Observable

  constructor(doc: Automerge.Doc<DocFields>, observer: Automerge.Observable) {
    this.doc = doc
    this.observer = observer
  }

  get root () {
    return this.doc.root
  }

  get id() {
    return this.doc.id
  }

  get text () {
    return this.doc.text.toString()
  }

  get title () {
    return this.doc.title.toString()
  }

  view() {
    return {
      root: this.root,
      text: this.text,
      title: this.title
    }
  }

  subscribe(onChange: Subscriber) {
    this.observer.observe(this.doc, (diff, before, after, local, changes) => {
      onChange(after)
    })
  }

  change(fn: Automerge.ChangeFn<DocFields>) {
    let newDoc = Automerge.change(this.doc, fn)
    this.doc = newDoc
  }

  save (): Uint8Array {
    return Automerge.save(this.doc)
  }

  static load(binary: Uint8Array): UpwellingDoc {
    let observable = new Automerge.Observable()
    let doc = Automerge.load<DocFields>(binary as Automerge.BinaryDocument, {observable})
    return new UpwellingDoc(doc, observable)
  }

  static fromString(payload: string): UpwellingDoc {
    let binary = Uint8Array.from(Buffer.from(payload, 'base64'))
    return UpwellingDoc.load(binary)
  }

  toString(): string {
    let binary = Automerge.save(this.doc)
    let payload = Buffer.from(binary).toString('base64')
    return payload
  }

  static create(id: string, title?: string): UpwellingDoc {
    let observable = new Automerge.Observable()
    let initialChange = Automerge.getLastLocalChange(Automerge.change(Automerge.init<DocFields>('0000'), { time: 0 }, (doc: DocFields) => {
      doc.root = id
      doc.id = nanoid()
      doc.title = new Automerge.Text(title || 'Untitled Document')
      doc.text = new Automerge.Text()
    }))
    let [ document , ]= Automerge.applyChanges<DocFields>(Automerge.init({observable}), [initialChange])
    return new UpwellingDoc(document, observable)
  }

  fork(): UpwellingDoc {
    let observable = new Automerge.Observable()
    let duplicate = Automerge.change(this.doc, (doc: DocFields) => {
      doc.id = nanoid()
    })
    let doc = Automerge.clone(duplicate, { observable })
    return new UpwellingDoc(doc, observable)
  }

  sync(theirs: UpwellingDoc) {
    let changes = Automerge.getAllChanges(theirs.doc)
    let [newDoc, patch] = Automerge.applyChanges(this.doc, changes)
    this.doc = newDoc
    return patch
  }
}
