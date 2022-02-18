import { Upwell } from 'api';
import FS from './storage/localStorage'
import intoStream from 'into-stream';
import HTTP from './storage/http';

const STORAGE_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:5001' : process.env.STORAGE_URL

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

export async function create () {
  let upwell = await Upwell.create()
  let id = await upwell.id()
  await save(upwell)
  upwells.set(id, upwell)
  return upwell
}

function toUpwell (binary: Buffer): Promise<Upwell> {
  return Upwell.deserialize(intoStream(binary))
}

export function get(id: string) {
  return upwells.get(id)
}

export async function open(id: string): Promise<Upwell> {
  return new Promise(async (resolve, reject) => {
    let upwell = upwells.get(id)
    if (upwell) return resolve(upwell)
    else {
      // local-first
     let localBinary = await storage.getItem(id)
      if (localBinary) {
        let ours = await toUpwell(localBinary)
        upwells.set(id, ours)
        return resolve(ours)
      }
    } 
    
    resolve(await sync(id))
  })
}

export async function save(upwell: Upwell): Promise<void> {
  let id = await upwell.id()
  let binary = await upwell.toFile()
  await storage.setItem(id, binary)
  return remote.setItem(id, binary)
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
  console.log('syncing with external')
  let inMemory = upwells.get(id)
  if (!inMemory) throw new Error('open or create the upwell first before syncing!')
  let remoteBinary = await remote.getItem(id)
  if (remoteBinary) {
    let buf = Buffer.from(remoteBinary)
    let inMemoryBuf = await inMemory.toFile()
    if (buf.equals(inMemoryBuf)) {
      // the one we have in memory is up to date
      return inMemory
    }
    console.log('external is new')
    let theirs = await toUpwell(buf)
    await inMemory.merge(theirs)
    let newFile = await inMemory.toFile()
    await storage.setItem(id, newFile)
    await remote.setItem(id, newFile)
    subscriber(id, inMemory)
  }
  return inMemory
}