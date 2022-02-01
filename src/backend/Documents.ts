import { nanoid } from 'nanoid';
import { sia, desia } from 'sializer';
import { UpwellingDoc } from './AutomergeDoc';
import AsyncStorage from './storage'

// Multiple UpwellingDocs that are persisted on disc
export default class Documents {
  db: AsyncStorage 
  remote: AsyncStorage | undefined

  constructor(db: AsyncStorage, remote?: AsyncStorage) {
    this.db = db
    this.remote = remote
  }

  async add(binary: Uint8Array): Promise<UpwellingDoc> {
    let opened = UpwellingDoc.load(binary)
    let existing = await this.get(opened.root)
    if (existing) {
      // we know about this document already.
      // merge this document with our existing document
      opened.sync(existing)
      this.persist(opened)
      return opened
    }  else {
      opened.createVersion('Copied', 'Anonymous Elephant')
      this.persist(opened)
      return opened
    }
  }

  persist(doc: UpwellingDoc): void {
    this.setMeta({
      id: doc.id,
      message: doc.message,
      title: doc.title,
    })
    this.db.setItem(doc.id, doc.save())
  }

  async syncWithServer(doc: UpwellingDoc) {
    if (!this.remote) throw new Error('Server not configured. Must supply remote to constructor.')
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
    // local-first
    let saved = await this.db.getItem(id)
    if (saved) return UpwellingDoc.load(saved)
    else if (this.remote) {
      try {
        let remote = await this.remote.getItem(id)
        if (remote) return UpwellingDoc.load(remote)
        else return null
      } catch (err) {
        return null
      }
    } else return null
  }

  exists(id: string): boolean {
    return this.db.getItem(id) !== null
  }

  create(): UpwellingDoc {
    let id = nanoid()
    let document: UpwellingDoc = UpwellingDoc.create(id)
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
  message: string

  constructor(title: string, id: string, message: string) {
    this.title = title
    this.id = id
    this.message = message
    throw new Error('New instances of this class cannot be created.')
  }

  static deserialize(payload: Uint8Array): UpwellingDocMetadata {
    return desia(payload)
  }

  static serialize(meta: UpwellingDocMetadata): Uint8Array {
    return sia({
      title: meta.title,
      id: meta.id,
      message: meta.message
    })
  }
}
