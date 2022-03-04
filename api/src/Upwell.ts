import { LazyLayer, Layer, Subscriber } from './Layer';
import { UpwellMetadata } from './UpwellMetadata';
import concat from 'concat-stream'
import tar from 'tar-stream'
import { nanoid } from 'nanoid';
import { Readable }  from 'stream';
import Debug from 'debug';
import { loadDoc } from 'automerge-wasm-pack';

export type Author = string 
export const UNKNOWN_AUTHOR = "Unknown"

export type UpwellOptions = {
  id?: string,
  author?: Author,
}

const debug = Debug('upwell')
const LAYER_EXT = '.layer'
const METADATA_KEY = 'metadata.automerge'

// An Upwell is multiple layers
export class Upwell {
  _layers: Map<string, Layer> = new Map();
  metadata: UpwellMetadata
  subscriber: Function = function noop () {}

  constructor(metadata: UpwellMetadata) {
    this.metadata = metadata
  }

  get id() {
    return this.metadata.id
  }

  rootLayer() {
    let rootId = this.metadata.main
    let root = this.layers().find(l => l.id === rootId)
    if (!root) throw new Error('No root?')
    return root
  }

  subscribe(subscriber: Function) {
    this.subscriber = subscriber
  }

  unsubscribe() {
    this.subscriber  = function noop () {}
  }

  layers(): Layer[] {
    return Array.from(this._layers.values())
  }

  add(layer: Layer): void {
    try {
      let existing = this.get(layer.id)
      // we know about this layer already.
      // merge this layer with our existing layer 
      existing.merge(layer)
      this.set(existing.id, existing)
    } catch (err) { 
      this.set(layer.id, layer)
    }
    this.subscriber()
  }

  share(id: string): void{
    let layer = this.get(id)
    layer.shared = true
    this.set(id, layer)
    this.subscriber()
  }

  isArchived(id: string) : boolean {
    return this.metadata.isArchived(id)
  }

  archive(id: string): void {
    this.metadata.archive(id)
    this.subscriber()
  }

  set(id: string, layer: Layer) {
    return this._layers.set(id, layer)
  }

  get(id: string): Layer { 
    let layer = this._layers.get(id)
    if (!layer) throw new Error('No layer with id=' + id)
    return layer
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
      let upwell = new Upwell(UpwellMetadata.create(nanoid(), 'Unknown'))

      let unpackFileStream = (stream: any, next: Function) => {
        let concatStream = concat((buf: Buffer) => {
          next(buf)
        })
        stream.on('error', (err: Error) => {
          console.error(err)
        })
        stream.pipe(concatStream)
        stream.resume() 
      }

      let extract = tar.extract()
      extract.on('entry', (header, stream, next) => {
        if (header.name === METADATA_KEY) {
          unpackFileStream(stream, (buf: Buffer) => {
            upwell.metadata = UpwellMetadata.load(buf)
            next()
          })
        } else {
          unpackFileStream(stream, (buf: Buffer) => {
            let filename = header.name
            let id = filename.split('.')[0]
            var start = new Date()
            let layer = Layer.load(id, buf)
            //@ts-ignore
            var end = new Date() - start
            debug('(loadDoc): execution time %dms', end)
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
      let start = new Date()
      let binary = layer.save()
      //@ts-ignore
      var end = new Date() - start
      debug('(save): execution time %dms', end)
      pack.entry({ name: `${layer.id}.${LAYER_EXT}`}, Buffer.from(binary))
    })

    pack.entry({ name: METADATA_KEY }, Buffer.from(this.metadata.doc.save()))
    pack.finalize()
    return pack
  }

  static create(options?: UpwellOptions): Upwell {
    let id = options?.id || nanoid()
    let author = options?.author || UNKNOWN_AUTHOR
    console.log('creating layer')
    let layer = Layer.create('Document initialized', author)
    let metadata = UpwellMetadata.create(id, layer.id)
    let upwell = new Upwell(metadata)
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
    this.subscriber()
  }
}

