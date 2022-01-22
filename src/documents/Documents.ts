import { nanoid } from 'nanoid';
import { sia, desia } from 'sializer';
import { UpwellingDoc }  from '.';
import AsyncStorage from '../storage'

// Multiple UpwellingDocs that are persisted on disc
export default class Upwelling {
  db: AsyncStorage 
  remote: AsyncStorage 

  constructor(db: AsyncStorage, remote: AsyncStorage) {
    this.db = db
    this.remote = remote
  }

  add(binary: Uint8Array) {
    let doc: UpwellingDoc = UpwellingDoc.load(binary)
    this.persist(doc)
    return doc
  }

  persist(doc: UpwellingDoc): void {
    this.setMeta({
      id: doc.id,
      title: doc.title,
    })
    this.db.setItem(doc.id, doc.save())
  }

  async syncWithServer(doc: UpwellingDoc) {
    try {
      let binary = await this.remote.getItem(doc.id)
      if (binary) {
        let theirs = UpwellingDoc.load(binary)
        doc.sync(theirs)
        this.persist(doc)
      }
    } catch (err) {
      console.log('No remote item exists for document with id=', doc.id)
      // this is no big deal. this just means there was no server item 
      // so we fail gracefully
    }
    return this.remote.setItem(doc.id, doc.save())
  }

  async get(id: string): Promise<UpwellingDoc | null> { 
    let saved = await this.db.getItem(id)
    if (saved) return UpwellingDoc.load(saved)
    else {
      try {
        let remote = await this.remote.getItem(id)
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

  create(title?: string): UpwellingDoc {
    let id = nanoid()
    let document: UpwellingDoc = UpwellingDoc.create(id, title)
    this.persist(document)
    return document
  }

  setMeta(meta: UpwellingDocMetadata): Promise<void> {
    return this.db.setItem(`meta-${meta.id}`, UpwellingDocMetadata.serialize(meta))
  }

  async getMeta(id: string) : Promise<UpwellingDocMetadata | null> {
    let item = await this.db.getItem(`meta-${id}`) 
    if (item) {
      return UpwellingDocMetadata.deserialize(item)
    }
    return null
  }

  async list(): Promise<UpwellingDocMetadata[]> {
    let ids = await this.db.ids()
    let res: UpwellingDocMetadata[] = []
    ids.forEach(id => {
      if (id.startsWith('meta')) {
        this.db.getItem(id).then(value => {
          if (value) res.push(UpwellingDocMetadata.deserialize(value))
        })
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

  static deserialize(payload: Uint8Array): UpwellingDocMetadata {
    return desia(payload)
  }

  static serialize(meta: UpwellingDocMetadata): Uint8Array {
    return sia({
      title: meta.title,
      id: meta.id
    })
  }
}
