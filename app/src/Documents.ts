import { RealTimeDraft, Upwell, Layer } from 'api'
import FS from './storage/localStorage'
import intoStream from 'into-stream'
import HTTP from './storage/http'

const STORAGE_URL = process.env.STORAGE_URL

console.log(STORAGE_URL)

export class Documents {
  upwells = new Map<string, Upwell>()
  storage = new FS('upwell-')
  remote = new HTTP(STORAGE_URL)
  subscriptions = new Map<string, Function>()
  rtc?: RealTimeDraft

  async create(_id?: string): Promise<Upwell> {
    let upwell = Upwell.create({ id: _id })
    let id = upwell.id
    this.upwells.set(id, upwell)
    return this.save(id)
  }

  subscribe(id: string, fn: Function) {
    this.subscriptions.set(id, fn)
  }

  updatePeers(id: string, did: string) {
    let upwell = this.get(id)
    let layer = upwell.get(did)

    if (this.rtc && this.rtc.draft.id === layer.id) {
      this.rtc.updatePeers()
    }
    return this.save(id)
  }

  upwellChanged(id: string) {
    return this.sync(id)
  }

  disconnect() {
    if (this.rtc) {
      this.rtc.destroy()
      this.rtc = undefined
    }
  }

  connect(draft: Layer): RealTimeDraft {
    if (this.rtc) return this.rtc
    this.rtc = new RealTimeDraft(draft)
    return this.rtc
  }

  unsubscribe(id: string) {
    this.subscriptions.delete(id)
  }

  toUpwell(binary: Buffer): Promise<Upwell> {
    let stream = intoStream(binary)
    return Upwell.deserialize(stream)
  }

  get(id: string): Upwell {
    let upwell = this.upwells.get(id)
    if (!upwell) throw new Error('open upwell before get')
    return upwell
  }

  notify(id: string) {
    let fn = this.subscriptions.get(id)
    if (fn) fn(this.upwells.get(id))
  }

  async save(id: string): Promise<Upwell> {
    let upwell = this.upwells.get(id)
    if (!upwell) throw new Error('upwell does not exist with id=' + id)
    let binary = await upwell.toFile()
    this.storage.setItem(id, binary)
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

      this.sync(id).then(resolve).catch(reject)
    })
  }

  async sync(id: string): Promise<Upwell> {
    let inMemory = this.upwells.get(id)
    let remoteBinary = await this.remote.getItem(id)
    if (!inMemory) {
      throw new Error('open or create the upwell first before syncing!')
    }
    if (!remoteBinary) {
      let newFile = await inMemory.toFile()
      await this.storage.setItem(id, newFile)
      try {
        await this.remote.setItem(id, newFile)
      } catch (err) {
        console.error('Could not connect to server')
      }
      return inMemory
    } else {
      // do sync
      let buf = Buffer.from(remoteBinary)
      let inMemoryBuf = await inMemory.toFile()
      if (buf.equals(inMemoryBuf)) {
        // the one we have in memory is up to date
        await this.storage.setItem(id, inMemoryBuf)
        return inMemory
      }
      // update our local one
      let theirs = await this.toUpwell(buf)
      inMemory.merge(theirs)
      this.notify(id)

      let newFile = await inMemory.toFile()
      this.storage.setItem(id, newFile)
      this.notify(id)
      this.remote
        .setItem(id, newFile)
        .then(() => {
          console.log('Synced!')
        })
        .catch((err) => {
          console.error('Failed to share!')
        })
    }
    return inMemory
  }
}

let documents: Documents

export default function boop(): Documents {
  if (documents) return documents
  documents = new Documents()
  return documents
}
