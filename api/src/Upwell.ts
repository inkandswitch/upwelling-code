import { Layer } from './Layer';
import { UpwellMetadata } from './UpwellMetadata';
import AsyncStorage from './storage'
import { memoryStore } from './storage/memory';

export type Author = string 

export type UpwellOptions = {
  fs?: AsyncStorage,
  author?: Author,
  remote?: AsyncStorage
}

const METADATA_FILENAME = 'metadata.automerge'
const LAYER_EXT = 'layer'


// An Upwell that is persisted on disk
export class Upwell {
  db: AsyncStorage 
  remote: AsyncStorage | undefined
  authors: Set<Author> = new Set()

  constructor(options?: UpwellOptions) {
    this.db = options?.fs || new memoryStore()
    this.remote = options?.remote
  }
  async layers(): Promise<Layer[]> {
    let ids = await this.db.ids()
    return Promise.all(ids.filter(id => id.endsWith(LAYER_EXT)).map(async id => {
      let value = await this.db.getItem(id)
      let layer = Layer.load(value)
      this.authors.add(layer.author)
      return layer
    }))
  }

  async add(layer: Layer): Promise<void> {
    let existing = await this.getLocal(layer.id)
    if (existing) {
      // we know about this layer already.
      // merge this layer with our existing layer 
      console.log('merging layers')
      layer.sync(existing)
    } 
    this.authors.add(layer.author)
    return this.persist(layer)
  }

  async persist(layer: Layer): Promise<void> {
    return this.db.setItem(`${layer.id}.${LAYER_EXT}`, layer.save())
  }

  async syncWithServer(layer: Layer) {
    if (!this.remote) throw new Error('Server not configured. Must supply remote to constructor.')
    try {
      let binary = await this.remote.getItem(layer.id)
      if (binary) {
        let theirs = Layer.load(binary)
        layer.sync(theirs)
        this.persist(layer)
      }
    } catch (err) {
      console.log('No remote item exists for layer with id=', layer.id)
      // this is no big deal. this just means this might be a new layer that hasn't been synced
      // with anyone yet
    }
    return this.remote.setItem(layer.id, layer.save())
  }

  async getLocal(id: string): Promise<Layer | null> { 
    // local-first
    let saved = await this.db.getItem(`${id}.${LAYER_EXT}`)
    if (!saved) return null
    return Layer.load(saved)
  }

  async getRemote(id: string) {
    try {
      let remote = await this.remote.getItem(id)
      if (remote) return Layer.load(remote)
      else return null
    } catch (err) {
      console.error(err)
      return null
    }
  }

  static async create(options?: UpwellOptions): Promise<Upwell> {
    let upwell = new Upwell(options)
    await upwell.initialize(options?.author || 'Unknown')
    return upwell
  }

  async initialize(author: Author) {
    let layer = Layer.create('Document initialized', author)
    let metadata = UpwellMetadata.create(layer.id)
    await this.saveMetadata(metadata)
    await this.persist(layer)
  }

  exists(id: string): boolean {
    return this.db.getItem(id) !== null
  }

  async metadata() : Promise<UpwellMetadata> {
    let item = await this.db.getItem(METADATA_FILENAME)
    if (item) {
      return UpwellMetadata.load(item)
    }
    throw new Error('No metadata file, that mean this upwell is corrupted?? :(')
  }

  async saveMetadata(metadata: UpwellMetadata) {
    await this.db.setItem(METADATA_FILENAME, metadata.doc.save())
  }
}

