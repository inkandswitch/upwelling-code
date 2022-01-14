import * as Automerge from 'automerge';
import { nanoid } from 'nanoid';

export interface DocFields  {
  parent: string 
  id: string 
  text: Automerge.Text
  title: string
}

export class UpwellingDoc {
  doc: Automerge.Doc<DocFields>

  constructor(doc: Automerge.Doc<DocFields>) {
    this.doc = doc
  }

  get id() {
    return this.doc.id
  }

  get text () {
    return this.doc.text.toString()
  }

  get title () {
    return this.doc.title
  }

  set title(title: string) {
    this.change(doc => {
      doc.title = title
    })
  }

  view() {
    return {
      text: this.text,
      title: this.title
    }
  }

  change(fn: Automerge.ChangeFn<DocFields>) {
    let newDoc = Automerge.change(this.doc, fn)
    this.doc = newDoc
  }

  static load(binary: Uint8Array): UpwellingDoc {
    return new UpwellingDoc(Automerge.load(binary as Automerge.BinaryDocument))
  }

  static deserialize(payload: string): UpwellingDoc {
    let binary = Uint8Array.from(Buffer.from(payload, 'base64'))
    return UpwellingDoc.load(binary)
  }

  static serialize(doc: UpwellingDoc): string {
    let binary = Automerge.save(doc.doc)
    let payload = Buffer.from(binary).toString('base64')
    return payload
  }

  static create(id: string, title: string): UpwellingDoc {
    let initialChange = Automerge.getLastLocalChange(Automerge.change(Automerge.init<DocFields>('0000'), { time: 0 }, (doc: DocFields) => {
      doc.id = id
      doc.parent = id 
      doc.title = title 
      doc.text = new Automerge.Text()
    }))
    let [ document , ]= Automerge.applyChanges<DocFields>(Automerge.init(), [initialChange])
    return new UpwellingDoc(document)
  }

  fork(): UpwellingDoc {
    let duplicate = Automerge.change(this.doc, (doc: DocFields) => {
      doc.id = nanoid()
    })
    return new UpwellingDoc(duplicate)
  }

  sync(theirs: UpwellingDoc) {
    let changes = Automerge.getAllChanges(theirs.doc)
    //@ts-ignore
    let [newDoc, patch] = Automerge.applyChanges(this.doc, changes)
    this.doc = newDoc
    return patch
  }
}
