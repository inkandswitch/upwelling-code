import { Layer } from './Layer';
import { UpwellMetadata } from './UpwellMetadata';
import Storage from './storage'
import { memoryStore } from './storage/memory';
import concat from 'concat-stream'
import tar from 'tar-stream'
import { nanoid } from 'nanoid';
import { Readable }  from 'stream';

export type Author = string 

export type UpwellOptions = {
  id?: string,
  fs?: Storage,
  author?: Author,
}

const LAYER_EXT = '.layer'
const METADATA_KEY = 'metadata.automerge'

// An Upwell is multiple layers
export class Upwell {
  db: Storage 
  authors: Set<Author> = new Set()

  constructor(options?: UpwellOptions) {
    this.db = options?.fs || new memoryStore()
  }

  get id() {
    return this.metadata().id
  }

  rootLayer() {
    let rootId = this.metadata().main
    return this.layers().find(l => l.id === rootId)
  }

  layers(): Layer[] {
    let ids = this.db.ids()
      
    return ids.filter(id => id.endsWith(LAYER_EXT)).map((filename: string) => {
      let value = this.db.getItem(filename)
      let id = filename.split('.')[0]
      let layer = Layer.load(id, value)
      layer.id = id
      this.authors.add(layer.author)
      return layer
    }, [])
  }

  add(layer: Layer): void {
    let existing = this.get(layer.id)
    if (existing) {
      // we know about this layer already.
      // merge this layer with our existing layer 
      let merged = Layer.merge(existing, layer)
      return this.set(merged.id, merged)
    } else { 
      this.authors.add(layer.author)
      return this.set(layer.id, layer)
    }
  }

  archive(id: string): void {
    let layer = this.get(id)
    layer.archived = true
    this.set(id, layer)
  }

  set(id: string, layer: Layer) {
    return this.db.setItem(`${id}.${LAYER_EXT}`, layer.save())
  }

  get(id: string): Layer | null { 
    // local-first
    let saved = this.db.getItem(`${id}.${LAYER_EXT}`)
    if (!saved) return null
    return Layer.load(id, saved)
  }

  async toFile(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      let pack = this.serialize()

      let toBinaryStream = concat((binary: Buffer) => {
        resolve(binary)
      })

      pack.pipe(toBinaryStream)
    })
  }

  static deserialize(stream: Readable, options?: UpwellOptions): Promise<Upwell> {
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
        if (header.name === METADATA_KEY) {
          unpackFileStream(stream, (buf) => {
            let metadata = UpwellMetadata.load(buf)
            upwell.saveMetadata(metadata)
            next()
          })
        } else {
          unpackFileStream(stream, (buf) => {
            let filename = header.name
            let id = filename.split('.')[0]
            let layer = Layer.load(id, buf)
            upwell.add(layer)
            next()
          })
        }
      })
  
      extract.on('finish', function () {
        resolve(upwell)
      })

      stream.pipe(extract)
    })
  }

  serialize(): tar.Pack {
    let pack = tar.pack()
    let layers = this.layers()
    layers.forEach(layer => {
      let binary = layer.save()
      pack.entry({ name: `${layer.id}.${LAYER_EXT}`}, Buffer.from(binary))
    })

    pack.entry({ name: METADATA_KEY }, Buffer.from(this.metadata().doc.save()))
    pack.finalize()
    return pack
  }

  static create(options?: UpwellOptions): Upwell {
    let upwell = new Upwell(options)
    let layer = Layer.create('Document initialized', options?.author || 'Unknown')
    let id = options?.id || nanoid()
    let metadata = UpwellMetadata.create(id, layer.id)
    upwell.saveMetadata(metadata)
    upwell.add(layer)
    return upwell
  }

  metadata() : UpwellMetadata {
    let item = this.db.getItem(METADATA_KEY)
    if (item) {
      return UpwellMetadata.load(item)
    }
    throw new Error('No metadata file, that mean this upwell is corrupted?? :(')
  }

  saveMetadata(metadata: UpwellMetadata) {
    this.db.setItem(METADATA_KEY, metadata.doc.save())
  }

  merge(other: Upwell) {
    let layersToMerge = other.layers()

    layersToMerge.forEach(layer => {
      this.add(layer)
    })

    let theirs = other.metadata()
    let ours = this.metadata()
    ours.doc.merge(theirs.doc)
    this.saveMetadata(ours)
  }
}

