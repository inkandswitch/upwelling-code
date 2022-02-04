import { nanoid } from 'nanoid';
import { UpwellingDoc, UpwellingDocMetadata  } from './UpwellDoc';
import AsyncStorage from './storage'

// An Upwell that is persisted on disk
export default class Upwell {
  db: AsyncStorage 
  remote: AsyncStorage | undefined

  constructor(db: AsyncStorage, remote?: AsyncStorage) {
    this.db = db
    this.remote = remote
  }

  async getRelatedDocuments(doc: UpwellingDoc): Promise<UpwellingDocMetadata[]> {
    // Get all documents with the same root id
    return (await this.list()).filter(meta => meta.id === doc.id)
  }

  async add(binary: Uint8Array): Promise<UpwellingDoc> {
    let opened = UpwellingDoc.load(binary)
    let existing = await this.get(opened.id)
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
    this.setMeta(doc.meta)
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
