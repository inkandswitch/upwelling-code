import { LazyLayer, Layer, Subscriber } from './Layer';
import { UpwellMetadata } from './UpwellMetadata';
import concat from 'concat-stream'
import tar from 'tar-stream'
import { nanoid } from 'nanoid';
import { Readable }  from 'stream';
import Debug from 'debug';

export type AuthorId = string;
const UNKNOWN_AUTHOR = {id: nanoid(), name: 'Anonymous'}

export type Author = {
  id: AuthorId,
  name: string
}

export type UpwellOptions = {
  id?: string,
  author: Author,
}

type MaybeLayer = {
  id: string,
  binary: Uint8Array
}

const debug = Debug('upwell')
const LAYER_EXT = '.layer'
const METADATA_KEY = 'metadata.automerge'

// An Upwell is multiple layers
export class Upwell {
  _layers: Map<string, Layer> = new Map();
  metadata: UpwellMetadata
  subscriber: Function = function noop () {}
  _archived: Map<string, Uint8Array> = new Map()

  constructor(metadata: UpwellMetadata) {
    this.metadata = metadata
  }

  get id() {
    return this.metadata.id
  }

  get rootLayer() {
    let rootId = this.metadata.main
    let root = this.layers().find(l => l.id === rootId)
    if (!root) throw new Error('No root?')
    return root
  }

  set rootLayer(layer: Layer) {
    // TODO: check to see that layer has been 
    // effectively 'rebased' on the latest
    let oldRoot = this.metadata.main
    this.metadata.main = layer.id
    this.archive(oldRoot)

    this.subscriber()
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

  getAuthorName(authorId: AuthorId): string | undefined {
    let author = this.metadata.getAuthor(authorId)
    if (author) return author.name
    else return undefined
  }

  createDraft(author: Author) {
    let message = 'Magenta'
    let newLayer = this.rootLayer.fork(message, author.id)
    this.add(newLayer)
    this.metadata.addAuthor(author)
    return newLayer
  }

  *getArchivedLayers(): Generator<Layer> {
    let archivedObj = this.metadata._getArchivedLayersObj()
    let archived = this.metadata.doc.keys(archivedObj)
    for (let i = 0; i < archived.length; i++) {
      let id = archived[i]
      let value = this.metadata.doc.value(archivedObj, id)
      if (value && value[0] === 'boolean') {
        let buf = this._archived.get(id)
        if (!buf) console.error('no buf', buf)
        else {
          let doc = Layer.load(id, buf)
          yield doc
        }
      }
    }
  }

  add(layer: Layer): void {
    this.set(layer.id, layer)
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
    let doc = this.get(id)
    this._archived.set(id, doc.save())
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

      let metadata: any = null 
      let extract = tar.extract()
      let layers: MaybeLayer[] = []

      function onentry (header, stream, next) {
        if (header.name === METADATA_KEY) {
          unpackFileStream(stream, (buf: Buffer) => {
            metadata = buf
            next()
          })
        } else {
          unpackFileStream(stream, (binary: Buffer) => {
            let filename = header.name
            let id = filename.split('.')[0]
            layers.push({
              id,
              binary: Uint8Array.from(binary)
            })
            next()
          })
        }
      }
  
      function finish () {
        let upwell = new Upwell(UpwellMetadata.load(metadata))
        layers.forEach(item => {
          let { id, binary } = item
          if (upwell.metadata.isArchived(id)) {
            upwell._archived.set(id, binary)
          } else {
            var start = new Date()
            let layer = Layer.load(id, binary)
            //@ts-ignore
            var end = new Date() - start
            debug('(loadDoc): execution time %dms', end)
            upwell.add(layer)
          }
        })
        resolve(upwell)
      }

      extract.on('entry', onentry)
      extract.on('finish', finish)

      stream.pipe(extract)
    })
  }

  serialize(): tar.Pack {
    let pack = tar.pack()
    let layers = this.layers()
    layers.forEach(writeLayer)
    
    function writeLayer (layer: Layer) {
      let start = new Date()
      let binary = layer.save()
      //@ts-ignore
      var end = new Date() - start
      debug('(save): execution time %dms', end)
      pack.entry({ name: `${layer.id}.${LAYER_EXT}`}, Buffer.from(binary))
    }

    pack.entry({ name: METADATA_KEY }, Buffer.from(this.metadata.doc.save()))
    pack.finalize()
    return pack
  }

  static create(options?: UpwellOptions): Upwell {
    let id = options?.id || nanoid()
    let author = options?.author || UNKNOWN_AUTHOR
    let layer = Layer.create('Document initialized', author.id)
    let metadata = UpwellMetadata.create(id, layer.id)
    metadata.addAuthor(author)
    let upwell = new Upwell(metadata)
    upwell.add(layer)

    return upwell
  }

  merge(other: Upwell) {
    let layersToMerge = other.layers()

    //merge layers
    layersToMerge.forEach(layer => {
      try {
        let existing = this.get(layer.id)
        existing.merge(layer)
      } catch (err) {
        this.add(layer) 
      }
    })

    //merge metadata
    let theirs = other.metadata
    let ours = this.metadata
    ours.doc.merge(theirs.doc)
    this.metadata = ours
    this.subscriber()
  }
}

