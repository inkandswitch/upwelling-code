import { nanoid } from 'nanoid';
import { Layer, LayerMetadata  } from './Layer';
import AsyncStorage from './storage'

// An Upwell that is persisted on disk
export class Upwell {
  db: AsyncStorage 
  remote: AsyncStorage | undefined

  constructor(db: AsyncStorage, remote?: AsyncStorage) {
    this.db = db
    this.remote = remote
  }

  async getRelatedDocuments(doc: Layer): Promise<LayerMetadata[]> {
    // Get all documents with the same root id
    return (await this.list()).filter(meta => meta.id === doc.id)
  }

  async add(binary: Uint8Array): Promise<Layer> {
    let opened = Layer.load(binary)
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

  persist(doc: Layer): void {
    this.setMeta(doc.meta)
    this.db.setItem(doc.id, doc.save())
  }

  async syncWithServer(doc: Layer) {
    if (!this.remote) throw new Error('Server not configured. Must supply remote to constructor.')
    try {
      let binary = await this.remote.getItem(doc.id)
      if (binary) {
        let theirs = Layer.load(binary)
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

  async get(id: string): Promise<Layer | null> { 
    // local-first
    let saved = await this.db.getItem(id)
    if (saved) return Layer.load(saved)
    else if (this.remote) {
      try {
        let remote = await this.remote.getItem(id)
        if (remote) return Layer.load(remote)
        else return null
      } catch (err) {
        return null
      }
    } else return null
  }

  exists(id: string): boolean {
    return this.db.getItem(id) !== null
  }

  create(): Layer {
    let id = nanoid()
    let document: Layer = Layer.create(id)
    this.persist(document)
    return document
  }

  setMeta(meta: LayerMetadata): Promise<void> {
    return this.db.setItem(`meta-${meta.id}`, LayerMetadata.serialize(meta))
  }

  async getMeta(id: string) : Promise<LayerMetadata | null> {
    let item = await this.db.getItem(`meta-${id}`) 
    if (item) {
      return LayerMetadata.deserialize(item)
    }
    return null
  }

  async list(): Promise<LayerMetadata[]> {
    let ids = await this.db.ids()
    let res: LayerMetadata[] = []
    ids.forEach(id => {
      if (id.startsWith('meta')) {
        this.db.getItem(id).then(value => {
          if (value) res.push(LayerMetadata.deserialize(value))
        })
      }
    })
    return res
  }
}
