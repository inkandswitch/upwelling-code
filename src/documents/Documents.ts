import { nanoid } from 'nanoid';
import { UpwellingDoc }  from '.';
import * as http from '../storage/http'

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
    this.persist(doc)
    return doc
  }

  persist(doc: UpwellingDoc): void {
    let payload = doc.toString()
    this.setMeta({
      id: doc.id,
      title: doc.title,
    })
    this.db.setItem(doc.id, payload)
  }

  async syncWithServer(doc: UpwellingDoc) {
    try {
      let theirs = UpwellingDoc.load(await http.getItem(doc.id))
      doc.sync(theirs)
      this.persist(doc)
    } catch (err) {
      console.error(err)
      // this is no big deal. this just means there was no server item 
    }
    return http.setItem(doc.id, doc.save())
  }

  async get(id: string): Promise<UpwellingDoc | null> { 
    let saved = this.db.getItem(id)
    if (saved) return UpwellingDoc.fromString(saved)
    else {
      try {
        let remote = await http.getItem(id)
        if (remote) return UpwellingDoc.load(remote)
        else return null
      } catch (err) {
        return null
      }
    }
  }

  exists(id: string): boolean {
    return this.db.getItem(id) !== null
  }

  create(title?: string) : UpwellingDoc {
    let id = nanoid()
    let document: UpwellingDoc = UpwellingDoc.create(id, title)
    this.persist(document)
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
