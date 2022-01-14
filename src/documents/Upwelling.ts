import { nanoid } from 'nanoid';
import { UpwellingDoc }  from './';

export interface Storage {
  setItem: (id: string, binary: string) => void,
  getItem: (id: string) => string | null,
  ids: () => string[]
}

// Multiple UpwellingDocs that are persisted on disc
export default class Upwelling {
  db: Storage 

  constructor(db: Storage) {
    this.db = db
  }

  add(binary: Uint8Array) {
    let doc: UpwellingDoc = UpwellingDoc.load(binary)
    this.save(doc)
    return doc
  }

  save(doc: UpwellingDoc): void {
    let payload = UpwellingDoc.serialize(doc)
    this.setMeta({
      id: doc.id,
      title: doc.title,
    })
    this.db.setItem(doc.id, payload)
  }

  load(id: string): UpwellingDoc | null { 
    let saved = this.db.getItem(id)
    if (saved) return UpwellingDoc.deserialize(saved)
    else return null
  }

  create(title: string) : UpwellingDoc {
    let id = nanoid()
    let document: UpwellingDoc = UpwellingDoc.create(id, title)
    this.save(document)
    return document
  }

  setMeta(meta: UpwellingDocMetadata) : void {
    this.db.setItem(`meta-${meta.id}`, UpwellingDocMetadata.serialize(meta))
  }

  getMeta(id: string) : UpwellingDocMetadata | null {
    let item = this.db.getItem(`meta-${id}`) as string
    if (item) {
      return UpwellingDocMetadata.deserialize(item)
    }
    return null
  }

  list(): UpwellingDocMetadata[] {
    let ids = this.db.ids()
    let res: UpwellingDocMetadata[] = []
    ids.forEach(id => {
      if (id.startsWith('meta')) {
        let value = this.db.getItem(id)
        if (value) res.push(UpwellingDocMetadata.deserialize(value))
      }
    })
    return res
  }
}

export class UpwellingDocMetadata {
  title: string
  id: string

  constructor(title: string, id: string) {
    this.title = title
    this.id = id
    throw new Error('New instances of this class cannot be created.')
  }

  static deserialize(payload: string): UpwellingDocMetadata {
    return JSON.parse(payload)
  }

  static serialize(meta: UpwellingDocMetadata): string {
    return JSON.stringify({
      title: meta.title,
      id: meta.id
    })
  }
}