import concat from 'concat-stream'
import tar from 'tar-stream'
import crypto from 'crypto'
import { nanoid } from 'nanoid'
import { Readable } from 'stream'
import { getRandomDessert } from 'random-desserts'
import Debug from 'debug'
import History from './History'
import { Draft } from './Draft'
import { UpwellMetadata } from './UpwellMetadata'

export type AuthorId = string
export const UNKNOWN_AUTHOR = { id: createAuthorId(), name: 'Anonymous' }

export type Author = {
  id: AuthorId
  name: string
  date?: number
}

export type UpwellOptions = {
  id?: string
  author: Author
}

type MaybeDraft = {
  id: DraftId
  binary: Uint8Array
}
export type DraftId = string

const debug = Debug('upwell')
const LAYER_EXT = '.draft'
const METADATA_KEY = 'metadata.automerge'

export function createAuthorId() {
  return crypto.randomBytes(16).toString('hex')
}

// An Upwell is multiple drafts
export class Upwell {
  _draftLayers: Map<string, Draft> = new Map()
  _archivedLayers: Map<string, Uint8Array> = new Map()
  metadata: UpwellMetadata
  author: Author
  static SPECIAL_ROOT_DOCUMENT = 'STACK'

  constructor(metadata: UpwellMetadata, author: Author) {
    this.metadata = metadata
    this.author = author
    this.metadata.addAuthor(author)
  }

  get id() {
    return this.metadata.id
  }

  get rootDraft() {
    let rootId = this.metadata.main
    return this.get(rootId)
  }

  get history(): History {
    return new History(this)
  }

  set rootDraft(draft: Draft) {
    this.rootDraft.merge(draft)
    this.metadata.addToHistory(draft.id)

    for (let draft of this.drafts()) {
      this.updateToRoot(draft)
    }
  }

  drafts(): Draft[] {
    // TODO: get draft list from metadata instead
    return Array.from(this._draftLayers.values()).filter((draft) => {
      return !this.isArchived(draft.id)
    })
  }

  getAuthorColor(authorId): string {
    return this.metadata.getAuthorColor(authorId)
  }

  getAuthorName(authorId: AuthorId): string | undefined {
    let author = this.metadata.getAuthor(authorId)
    if (author) return author.name
    else return undefined
  }

  _add(draft: Draft) {
    this._draftLayers.set(draft.id, draft)
    this.metadata.addDraft(draft)
  }

  createDraft(message?: string) {
    if (!message) message = getRandomDessert() as string
    let newDraft = this.rootDraft.fork(message, this.author)
    this._add(newDraft)
    return newDraft
  }

  share(id: string): void {
    let draft = this.get(id)
    draft.shared = true
    this._add(draft)
  }

  updateToRoot(draft: Draft) {
    let root = this.rootDraft
    let message = draft.message
    draft.merge(root)
    draft.message = message
    draft.parent_id = root.id
    this._add(draft)
  }

  isArchived(id: string): boolean {
    return this.metadata.isArchived(id)
  }

  archive(id: string): void {
    if (this.isArchived(id)) return console.log('skipping', id)
    let draft = this._draftLayers.get(id)
    if (!draft) throw new Error('Draft with doesnt exist with id=' + id)
    this.metadata.archive(draft.id)
  }

  _coerceDraft(id, buf: Draft | Uint8Array): Draft {
    if (buf?.constructor.name === 'Uint8Array')
      return Draft.load(id, buf as Uint8Array, this.author.id)
    else return buf as Draft
  }

  get(id: string): Draft {
    if (id === 'stack') return this.rootDraft
    let draft = this._draftLayers.get(id)
    if (!draft) {
      let buf = this._archivedLayers.get(id)
      if (!buf) throw new Error('mystery id=' + id)
      // TODO: if draft doesn't exist locally, go fetch it on the server as a last-ditch effort
      return this._coerceDraft(id, buf)
    }
    return draft
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

  static deserialize(stream: Readable, author: Author): Promise<Upwell> {
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
      let drafts: MaybeDraft[] = []

      function onentry(header, stream, next) {
        if (header.name === METADATA_KEY) {
          unpackFileStream(stream, (buf: Buffer) => {
            metadata = buf
            next()
          })
        } else {
          unpackFileStream(stream, (binary: Buffer) => {
            let filename = header.name
            let id = filename.split('.')[0]
            drafts.push({
              id,
              binary: Uint8Array.from(binary),
            })
            next()
          })
        }
      }

      function finish() {
        let upwell = new Upwell(UpwellMetadata.load(metadata), author)
        drafts.forEach((item) => {
          let { id, binary } = item
          if (!upwell.isArchived(id) || id === upwell.metadata.main) {
            var start = new Date()
            let draft = Draft.load(id, binary, author.id)
            //@ts-ignore
            var end = new Date() - start
            debug('(loadDoc): execution time %dms', end)
            upwell._draftLayers.set(draft.id, draft)
          } else {
            upwell._archivedLayers.set(id, binary)
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
    let start = Date.now()
    let pack = tar.pack()
    let drafts = this.drafts()
    drafts.forEach((draft: Draft) => {
      writeDraft(draft.id, draft.save())
    })

    writeDraft(this.rootDraft.id, this.rootDraft.save())

    function writeDraft(id, binary: Uint8Array) {
      pack.entry({ name: `${id}.${LAYER_EXT}` }, Buffer.from(binary))
    }

    pack.entry({ name: METADATA_KEY }, Buffer.from(this.metadata.doc.save()))
    pack.finalize()
    let end = Date.now() - start
    debug('(serialize): execution time %dms', end)
    return pack
  }

  static create(options?: UpwellOptions): Upwell {
    let id = options?.id || nanoid()
    let author = options?.author || UNKNOWN_AUTHOR
    let root = Draft.create(Upwell.SPECIAL_ROOT_DOCUMENT, author.id)
    let metadata = UpwellMetadata.create(id)
    let upwell = new Upwell(metadata, author)
    upwell._add(root)
    metadata.addToHistory(root.id)
    root.parent_id = root.id
    upwell.createDraft('First draft') // always create an initial draft
    return upwell
  }

  merge(other: Upwell) {
    let draftsToMerge = other.drafts()

    let somethingChanged = false
    //merge drafts
    draftsToMerge.forEach((draft) => {
      try {
        let existing = this.get(draft.id)
        let heads = existing.doc.getHeads()
        let opIds = existing.merge(draft)
        let newHeads = existing.doc.getHeads()
        if (opIds.length > 0 || !arrayEquals(heads, newHeads)) {
          somethingChanged = true
        }
      } catch (err) {
        somethingChanged = true
        this._add(draft)
      }
    })
    let localDrafts = this.drafts()
    localDrafts.forEach((draft) => {
      try {
        other.get(draft.id)
      } catch (err) {
        somethingChanged = true
      }
    })

    //merge metadata
    let heads = this.metadata.doc.getHeads()
    let opIds = this.metadata.doc.merge(other.metadata.doc)
    let newHeads = this.metadata.doc.getHeads()
    if (opIds.length > 0 || !arrayEquals(heads, newHeads)) {
      somethingChanged = true
    }
    return somethingChanged
  }
}

function arrayEquals(a: Array<any>, b: Array<any>) {
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((val, index) => val === b[index])
  )
}
