import { RealTimeUpwell, Author, RealTimeDraft, Upwell } from '.'
import FS from './storage/localStorage'
import intoStream from 'into-stream'
import HTTP from './storage/http'
import debug from 'debug'

let log = debug('upwell:documents')

// TODO: refactor to not store the whole upwell as a file but instead individual draft ids

export class Documents {
  upwells = new Map<string, Upwell>()
  storage = new FS('upwell-')
  remote: HTTP
  subscriptions = new Map<string, Function>()
  author: Author
  rtcUpwell?: RealTimeUpwell
  rtcDraft?: RealTimeDraft

  constructor(author: Author, storage_url: string) {
    this.author = author
    this.remote = new HTTP(storage_url)
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
    this.save(id)
    if (this.rtcDraft && this.rtcDraft.draft.id === did) {
      log('updating peers')
      this.rtcDraft.updatePeers()
    }
  }

  disconnect(id: string) {
    if (this.rtcUpwell && this.rtcUpwell.id === id) {
      this.rtcUpwell.destroy()
      log('disconnecting')
      this.rtcUpwell = undefined
    } else if (this.rtcDraft && this.rtcDraft.id === id) {
      this.rtcDraft.destroy()
      log('disconnecting')
      this.rtcDraft = undefined
    }
  }

  connectUpwell(id: string) {
    let upwell = this.get(id)
    if (this.rtcUpwell) return
    this.rtcUpwell = new RealTimeUpwell(upwell, this.author)
    this.rtcUpwell.on('data', () => {
      log('got change')
      this.upwellChanged(id, false)
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

  upwellChanged(id: string, local: boolean) {
    let fn = this.subscriptions.get(id) || function () {}
    fn(local)
  }

  async save(id: string): Promise<Upwell> {
    let upwell = this.upwells.get(id)
    if (!upwell) throw new Error('upwell does not exist with id=' + id)
    let binary = await upwell.toFile()
    this.storage.setItem(id, binary)
    this.upwellChanged(id, true)
    return upwell
  }

  async open(id: string): Promise<Upwell> {
    return new Promise(async (resolve, reject) => {
      let upwell = this.upwells.get(id)
      if (upwell) return resolve(upwell)
      else {
        // local-first
        let localBinary = this.storage.getItem(id)
        if (localBinary) {
          let ours = await this.toUpwell(localBinary)
          this.upwells.set(id, ours)
          return resolve(ours)
        } else {
          // no local binary, get from server
          try {
            let remoteBinary = await this.remote.getItem(id)
            if (remoteBinary) {
              let theirs = await this.toUpwell(Buffer.from(remoteBinary))
              this.upwells.set(id, theirs)
              return resolve(theirs)
            }
          } catch (err) {
            console.error('Could not connect to server')
          }
        }
      }
    })
  }

  async sync(id: string): Promise<Response> {
    let inMemory = this.upwells.get(id)
    let remoteBinary = await this.remote.getItem(id)
    if (!inMemory) {
      throw new Error('open or create the upwell first before syncing!')
    }
    if (!remoteBinary) {
      let newFile = await inMemory.toFile()
      await this.storage.setItem(id, newFile)
      return this.remote.setItem(id, newFile)
    } else {
      // do sync
      let buf = Buffer.from(remoteBinary)
      let theirs = await this.toUpwell(buf)
      // update our local one
      inMemory.merge(theirs)
      let newFile = await inMemory.toFile()
      this.storage.setItem(id, newFile)
      log('uploading', id)
      return this.remote.setItem(id, newFile)
    }
  }
}
