import * as Automerge from 'automerge';
import { nanoid } from 'nanoid';

export type DocFields = {
  root: string 
  version: {
    id: string,
    message: string
  },
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

  get version () {
    return this.doc.version
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
    let newDoc = Automerge.change<DocFields>(this.doc, fn)
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

  static create(id: string, title?: string): UpwellingDoc {
    let observable = new Automerge.Observable()
    let initialChange = Automerge.getLastLocalChange(Automerge.change(Automerge.init<DocFields>('0000'), { time: 0 }, (doc: DocFields) => {
      doc.root = id
      doc.version = {
        id: nanoid(),
        message: 'Document initialized'
      }
      doc.title = new Automerge.Text(title || 'Untitled Document')
      doc.text = new Automerge.Text()
    }))
    let [ document , ]= Automerge.applyChanges<DocFields>(Automerge.init({observable}), [initialChange])
    return new UpwellingDoc(document, observable)
  }

  getVersionHistory(): DocFields[] {
    let history = Automerge.getHistory(this.doc)
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

  createVersion(message: string): void {
    this.change((doc: DocFields) => {
      doc.version = {
        id: nanoid(),
        message
      }
    })
  }

  sync(theirs: UpwellingDoc) {
    let changes = Automerge.getAllChanges(theirs.doc)
    let [newDoc, patch] = Automerge.applyChanges(this.doc, changes)
    this.doc = newDoc
    return patch
  }
}
