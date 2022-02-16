import { Layer } from './Layer';
import { UpwellMetadata } from './UpwellMetadata';
import AsyncStorage from './storage'
import { memoryStore } from './storage/memory';
import concat from 'concat-stream'
import tar from 'tar-stream'

export type Author = string 

export type UpwellOptions = {
  fs?: AsyncStorage,
  author?: Author,
}

const METADATA_FILENAME = 'metadata.automerge'

// An Upwell that is persisted on disk
export class Upwell {
  db: AsyncStorage 
  authors: Set<Author> = new Set()

  constructor(options?: UpwellOptions) {
    this.db = options?.fs || new memoryStore()
  }

  async id() {
    return (await this.metadata()).id
  }

  async rootLayer() {
    let rootId = (await this.metadata()).main
    return (await this.layers()).find(l => l.id === rootId)
  }

  async layers(): Promise<Layer[]> {
    let ids = await this.db.ids()
      
    let rootId = (await this.metadata()).main
    let tasks = ids.filter(id => id !== METADATA_FILENAME ).map(async (id: string) => {
      let value = await this.db.getItem(id)
      let layer = Layer.load(id, value)
      layer.id = id
      if (layer.id === rootId) layer.visible = true
      this.authors.add(layer.author)
      return layer
    }, [])
    return Promise.all(tasks)
  }

  async add(layer: Layer): Promise<void> {
    let existing = await this.getLocal(layer.id)
    if (existing) {
      // we know about this layer already.
      // merge this layer with our existing layer 
      let merged = Layer.merge(existing, layer)
      return this.persist(merged)
    } else { 
      this.authors.add(layer.author)
      return this.persist(layer)
    }
  }

  async persist(layer: Layer): Promise<void> {
    return this.db.setItem(`${layer.id}`, layer.save())
  }

  async archive(layer_id: string): Promise<void> {
    let layer = await this.getLocal(layer_id)
    layer.archived = true
    return this.persist(layer)
  }

  async getLocal(id: string): Promise<Layer | null> { 
    // local-first
    let saved = await this.db.getItem(id)
    if (!saved) return null
    return Layer.load(id, saved)
  }

  static deserialize(stream: tar.Pack, options?: UpwellOptions): Promise<Upwell> {
    return new Promise<Upwell>((resolve, reject) => {
      let upwell = new Upwell(options)

      let unpackFileStream = (stream, next) => {
        let concatStream = concat((buf) => {
          next(buf)
        })
        stream.on('error', (err) => {
          console.error(err)
        })
        stream.pipe(concatStream)
        stream.resume() 
      }

      let extract = tar.extract()
      extract.on('entry', (header, stream, next) => {
        if (header.name === METADATA_FILENAME) {
          unpackFileStream(stream, (buf) => {
            let metadata = UpwellMetadata.load(buf)
            upwell.saveMetadata(metadata).then(next)
          })
        } else {
          unpackFileStream(stream, (buf) => {
            let layer = Layer.load(header.name, buf)
            upwell.add(layer).then(next)
          })
        }
      })
  
      extract.on('finish', function () {
        resolve(upwell)
      })

      stream.pipe(extract)
    })
  }

  async serialize(): Promise<tar.Pack> {
    let pack = tar.pack()
    let layers = await this.layers()
    layers.forEach(layer => {
      let binary = layer.save()
      pack.entry({ name: layer.id}, Buffer.from(binary))
    })

    pack.entry({ name: METADATA_FILENAME }, Buffer.from((await this.metadata()).doc.save()))
    pack.finalize()
    return pack
  }

  static async create(options?: UpwellOptions): Promise<Upwell> {
    let upwell = new Upwell(options)
    let layer = Layer.create('Document initialized', options?.author || 'Unknown')
    let metadata = UpwellMetadata.create(layer.id)
    await upwell.saveMetadata(metadata)
    await upwell.persist(layer)
    return upwell
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

  async merge(other: Upwell) {
    let layersToMerge = await other.layers()

    layersToMerge.forEach(async layer => {
      await this.add(layer)
    })

    let theirs = await other.metadata()
    let ours = await this.metadata()
    ours.doc.merge(theirs.doc)
    this.saveMetadata(ours)
  }
}

