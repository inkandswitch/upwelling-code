import { Upwell } from 'api';
import FS from './storage/localStorage'
import intoStream from 'into-stream';
import HTTP from './storage/http';

const STORAGE_URL = process.env.STORAGE_URL 

console.log(STORAGE_URL)

let noop = function () { }

let upwells: Map<string, Upwell> = new Map<string, Upwell>();
let storage = new FS('upwell-')
let remote = new HTTP(STORAGE_URL)
let interval: any = null
let subscriber: Subscriber = noop
type Subscriber = (id: string, upwell: Upwell) => void

export async function unsubscribe() {
  subscriber = noop
}

export async function subscribe(_subscriber: Subscriber) {
  subscriber = _subscriber
}

export async function create () : Promise<Upwell> {
  let upwell = Upwell.create()
  let id = upwell.id
  upwells.set(id, upwell)
  return save(id)
}

function toUpwell (binary: Buffer): Promise<Upwell> {
  let stream = intoStream(binary)
  return Upwell.deserialize(stream)
}

export function get(id: string): Upwell {
  let upwell = upwells.get(id)
  if (!upwell) throw new Error('open upwell before get')
  return upwell
}

export async function open(id: string): Promise<Upwell> {
  return new Promise(async (resolve, reject) => {
    let upwell = upwells.get(id)
    if (upwell) return resolve(upwell)
    else {
      // local-first
     let localBinary = storage.getItem(id)
      if (localBinary) {
        let ours = await toUpwell(localBinary)
        upwells.set(id, ours)
        return resolve(ours)
      } else {
        let remoteBinary = await remote.getItem(id)
        if (remoteBinary) {
          let theirs = await toUpwell(Buffer.from(remoteBinary))
          upwells.set(id, theirs)
          return resolve(theirs)
        }
      }
    } 
    
    sync(id).then(resolve).catch(reject)
  })
}

export async function save(id: string): Promise<Upwell> {
  let upwell = upwells.get(id)
  if (!upwell) throw new Error('upwell does not exist with id=' + id)
  let binary = await upwell.toFile()
  storage.setItem(id, binary)
  return upwell
}

export function stopSyncInterval () {
  clearInterval(interval)
}

export function startSyncInterval (id: string, timeout: number) {
  console.log('starting save inteval')
  clearInterval(interval)
  return setInterval(() => {
    sync(id)
  }, timeout)
}

export async function sync(id: string): Promise<Upwell> {
  let inMemory = upwells.get(id)
  let remoteBinary = await remote.getItem(id)
  if (!inMemory) {
    throw new Error('open or create the upwell first before syncing!')
  }
  if (!remoteBinary) {
    let newFile = await inMemory.toFile()
    remote.setItem(id, newFile).then(() => {
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
    let theirs = await toUpwell(buf)
    inMemory.merge(theirs)
    let newFile = await inMemory.toFile()
    storage.setItem(id, newFile)
    remote.setItem(id, newFile).then(() => {
      console.log('Synced!')
    }).catch(err => {
      console.error('Failed to share!')
    })
    subscriber(id, inMemory)
  } 
  return inMemory
}