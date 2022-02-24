import { Layer } from './Layer';
import { UpwellMetadata } from './UpwellMetadata';
import concat from 'concat-stream'
import tar from 'tar-stream'
import { nanoid } from 'nanoid';
import { Readable }  from 'stream';

export type Author = string 

export type UpwellOptions = {
  id?: string,
  author?: Author,
}

const LAYER_EXT = '.layer'
const METADATA_KEY = 'metadata.automerge'

// An Upwell is multiple layers
export class Upwell {
  _layers: Map<string, Layer> = new Map();
  authors: Set<Author> = new Set()
  metadata: UpwellMetadata

  get id() {
    return this.metadata.id
  }

  rootLayer() {
    let rootId = this.metadata.main
    return this.layers().find(l => l.id === rootId)
  }

  layers(): Layer[] {
    return Array.from(this._layers.values())
  }

  add(layer: Layer): void {
    let existing = this.get(layer.id)
    if (existing) {
      // we know about this layer already.
      // merge this layer with our existing layer 
      let merged = Layer.merge(existing, layer)
      this.set(merged.id, merged)
    } else { 
      this.authors.add(layer.author)
      this.set(layer.id, layer)
    }
  }

  archive(id: string): void {
    let layer = this.get(id)
    layer.archived = true
    this.set(id, layer)
  }

  set(id: string, layer: Layer) {
    return this._layers.set(id, layer)
  }

  get(id: string): Layer | null { 
    return this._layers.get(id)
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

  static deserialize(stream: Readable): Promise<Upwell> {
    return new Promise<Upwell>((resolve, reject) => {
      let upwell = new Upwell()

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
            upwell.metadata = UpwellMetadata.load(buf)
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

    pack.entry({ name: METADATA_KEY }, Buffer.from(this.metadata.doc.save()))
    pack.finalize()
    return pack
  }

  static create(options?: UpwellOptions): Upwell {
    let upwell = new Upwell()
    let layer = Layer.create('Document initialized', options?.author || 'Unknown')
    let id = options?.id || nanoid()
    upwell.metadata = UpwellMetadata.create(id, layer.id)
    upwell.add(layer)
    return upwell
  }

  merge(other: Upwell) {
    let layersToMerge = other.layers()

    //merge layers
    layersToMerge.forEach(layer => {
      this.add(layer)
    })

    //merge metadata
    let theirs = other.metadata
    let ours = this.metadata
    ours.doc.merge(theirs.doc)
    this.metadata = ours
  }
}

