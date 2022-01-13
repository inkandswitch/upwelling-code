import * as Automerge from 'automerge';
import { nanoid } from 'nanoid';

export type TreeDoc = {
  parent: string,
  id: string,
  text: Automerge.Text
  title: Automerge.Text,
}

export class ForkableDocument {
  doc: Automerge.Doc<TreeDoc>

  constructor(doc: Automerge.Doc<TreeDoc>) {
    this.doc = doc
  }

  get id() {
    return this.doc.id
  }

  change(fn: Automerge.ChangeFn<TreeDoc>) {
    let newDoc = Automerge.change(this.doc, fn)
    this.doc = newDoc
  }

  static load(binary: Uint8Array): ForkableDocument {
    return new ForkableDocument(Automerge.load(binary as Automerge.BinaryDocument))
  }

  static create (id: string): ForkableDocument {
    let initialChange = Automerge.getLastLocalChange(Automerge.change(Automerge.init('0000'), { time: 0 }, (doc: TreeDoc) => {
      doc.parent = id
      doc.id = id
      doc.title = new Automerge.Text('')
      doc.text = new Automerge.Text('')
    }))
    let [ document , ]= Automerge.applyChanges(Automerge.init<TreeDoc>(), [initialChange])
    return new ForkableDocument(document)
  }
  
  fork(): ForkableDocument {
    let duplicate = Automerge.change<TreeDoc>(this.doc, (doc: TreeDoc) => {
      doc.id = nanoid()
    })
    return new ForkableDocument(duplicate)
  }

  sync(theirs: ForkableDocument) {
    let changes = Automerge.getAllChanges(theirs.doc)
    //@ts-ignore
    let [newDoc, patch] = Automerge.applyChanges(this.doc, changes)
    this.doc = newDoc
    return patch
  }

}
