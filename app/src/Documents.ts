import {
  RealTimeUpwell,
  Author,
  RealTimeDraft,
  Upwell,
  createAuthorId,
} from 'api'
import FS from './storage/localStorage'
import HTTP from './storage/http'
import intoStream from 'into-stream'
import catNames from 'cat-names'
import debug from 'debug'

const STORAGE_URL = process.env.STORAGE_URL

let log = debug('upwell:documents')

console.log(STORAGE_URL)

// TODO: refactor to not store the whole upwell as a file but instead individual draft ids

export class Documents {
  upwell?: Upwell = undefined
  paths = new Map<string, string>()
  upwells = new Map<string, Upwell>()
  storage = new FS('upwell-')
  remote = new HTTP(STORAGE_URL)
  subscriptions = new Map<string, Function>()
  author: Author
  rtcUpwell?: RealTimeUpwell
  rtcDraft?: RealTimeDraft

  constructor(author: Author) {
    this.author = author
  }

  set authorName(name: string) {
    localStorage.setItem('authorName', name)
  }

  async create(id: string, author: Author): Promise<Upwell> {
    let upwell = Upwell.create({ id, author })
    this.author = author
    this.upwells.set(id, upwell)
    return this.save(id)
  }

  subscribe(id: string, fn: Function) {
    if (this.subscriptions.get(id)) return
    this.subscriptions.set(id, fn)
  }

  draftChanged(id: string, did: string) {
    if (this.rtcDraft && this.rtcDraft.draft.id === did) {
      log('updating peers')
      this.save(id)
      this.rtcDraft.updatePeers()
    }
  }

  disconnect(id?: string) {
    if (this.rtcUpwell && this.rtcUpwell.id === id) {
      this.rtcUpwell.destroy()
      log('disconnecting')
      this.rtcUpwell = undefined
    } else if (this.rtcDraft) {
      this.rtcDraft.destroy()
      log('disconnecting')
      this.rtcDraft = undefined
    }
  }

  connectUpwell(id: string) {
    let upwell = this.get(id)
    if (this.rtcUpwell) return
    this.rtcUpwell = new RealTimeUpwell(upwell, this.author)
    this.rtcUpwell.on('data', ({ opIds }) => {
      log('got change', opIds)
      this.upwellChanged(id, false, opIds)
    })
  }

  connectDraft(id: string, did: string) {
    let upwell = this.get(id)
    let draft = upwell.get(did)
    if (this.rtcDraft) return this.rtcDraft
    this.rtcDraft = new RealTimeDraft(draft, this.author)
    return this.rtcDraft
  }

  unsubscribe(id: string) {
    this.subscriptions.delete(id)
  }

  toUpwell(binary: Buffer): Promise<Upwell> {
    let stream = intoStream(binary)
    return Upwell.deserialize(stream, this.author)
  }

  get(id: string): Upwell {
    let upwell = this.upwells.get(id)
    if (!upwell) throw new Error('open upwell before get')
    return upwell
  }

  upwellChanged(id: string, local: boolean, opIds?: string[]) {
    let fn = this.subscriptions.get(id) || noop
    fn(local, opIds)
  }

  async save(id: string): Promise<Upwell> {
    let upwell = this.upwells.get(id)
    if (!upwell) throw new Error('upwell does not exist with id=' + id)
    log('save called')
    let binary = await upwell.toFile()
    await this.storage.setItem(id, binary)
    this.upwellChanged(id, true)
    return upwell
  }

  async open(id: string, filename?: string): Promise<Upwell> {
    if (filename) this.paths.set(id, filename)
    let upwell = this.upwells.get(id)
    if (upwell) {
      this.upwell = upwell
      return upwell
    } else {
      // get local doc
      let localBinary = await this.storage.getItem(id)
      if (localBinary) {
        let ours = await this.toUpwell(localBinary)
        this.upwells.set(id, ours)
        this.upwell = ours
        return ours
      } else {
        throw new Error('No document with id=' + id)
      }
    }
  }

  async sync(id: string): Promise<any> {
    log('sync called')
    let filename = this.paths.get(id)
    let inMemory = this.upwells.get(id)
    let remoteBinary = await this.remote.getItem(id)
    if (!inMemory && remoteBinary) {
      let buf = Buffer.from(remoteBinary)
      let upwell = await this.toUpwell(buf)
      this.upwells.set(id, upwell)
      this.upwell = upwell
      await this.storage.setItem(id, buf)
      log('setting item on remote')
      return this.remote.setItem(id, buf, filename)
    } else if (!remoteBinary && inMemory) {
      this.upwell = inMemory
      let newFile = await inMemory.toFile()
      log('saving item on local')
      await this.storage.setItem(id, newFile)
      return this.remote.setItem(id, newFile, filename)
    } else if (inMemory && remoteBinary) {
      let buf = Buffer.from(remoteBinary)
      // do sync
      let theirs = await this.toUpwell(buf)
      // update our local one
      inMemory.merge(theirs)
      this.upwell = inMemory
      let newFile = await inMemory.toFile()
      await this.storage.setItem(id, newFile)
      log('uploading', id)
      return this.remote.setItem(id, newFile, filename)
    }
  }
}

var documents: Documents

export default function initialize(): Documents {
  if (documents) return documents
  let author = {
    id: localStorage.getItem('authorId'),
    name: localStorage.getItem('authorName'),
  }
  if (!author.id) {
    author.id = createAuthorId()
    localStorage.setItem('authorId', author.id)
  }
  if (!author.name) {
    author.name = catNames.random()
    localStorage.setItem('authorName', author.name)
  }
  documents = new Documents({
    id: author.id,
    name: author.name,
  })
  return documents
}

function noop() {}
