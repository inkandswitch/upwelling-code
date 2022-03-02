import { Upwell } from 'api';
import FS from './storage/localStorage'
import intoStream from 'into-stream';
import HTTP from './storage/http';

const STORAGE_URL = process.env.STORAGE_URL 

console.log(STORAGE_URL)

export class Documents {
  upwells: Map<string, Upwell> = new Map<string, Upwell>();
  storage = new FS('upwell-')
  remote = new HTTP(STORAGE_URL)

  async create (_id?: string) : Promise<Upwell> {
    let upwell = Upwell.create({ id: _id })
    let id = upwell.id
    this.upwells.set(id, upwell)
    return this.save(id)
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
          let remoteBinary = await this.remote.getItem(id)
          if (remoteBinary) {
            let theirs = await this.toUpwell(Buffer.from(remoteBinary))
            this.upwells.set(id, theirs)
            return resolve(theirs)
          }
        }
      }

      this.sync(id).then(resolve).catch(reject)
    })
  }

  async sync(id: string): Promise<Upwell> {
    let inMemory = documents.upwells.get(id)
    let remoteBinary = await documents.remote.getItem(id)
    if (!inMemory) {
      throw new Error('open or create the upwell first before syncing!')
    }
    if (!remoteBinary) {
      let newFile = await inMemory.toFile()
      documents.remote.setItem(id, newFile).then(() => {
        console.log('Shared for the first time!')
      }).catch(err => {
        console.error('Failed to share!')
      })
    } else {
      // do sync
      let buf = Buffer.from(remoteBinary)
      let inMemoryBuf = await inMemory.toFile()
      if (buf.equals(inMemoryBuf)) {
        // the one we have in memory is up to date
        return inMemory
      }
      let theirs = await this.toUpwell(buf)
      inMemory.merge(theirs)
      let newFile = await inMemory.toFile()
      documents.storage.setItem(id, newFile)
      documents.remote.setItem(id, newFile).then(() => {
        console.log('Synced!')
      }).catch(err => {
        console.error('Failed to share!')
      })
    }
    return inMemory
  }
}

let documents: Documents

export default function boop() : Documents {
  if (documents) return documents
  documents = new Documents()
  return documents
}

