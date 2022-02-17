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

type Subscriber = (upwell: Upwell) => void

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

let toUpwell = function (binary: Buffer): Promise<Upwell> {
  return Upwell.deserialize(intoStream(binary))
}

export async function get(id: string): Promise<Upwell> {
  return new Promise(async (resolve, reject) => {
    let upwell = upwells.get(id)
    if (upwell) return resolve(upwell)
    let buf = await storage.getItem(id)

    if (!buf) {
      let remoteBinary = await remote.getItem(id)
      if (remoteBinary) buf = Buffer.from(remoteBinary)
      return resolve(await toUpwell(buf!))
    }
    if (buf) {
      let ours = await toUpwell(buf)
      sync(ours)
      return resolve(ours)
    }

    return reject(new Error('item does not exist with id=' + id))
  })
}

export async function save(upwell: Upwell): Promise<void> {
  let id = await upwell.id()
  let binary = await upwell.toFile()
  storage.setItem(id, binary)
}

export function stopSaveInterval () {
  clearInterval(interval)
}

export function startSaveInterval (upwell: Upwell, timeout: number) {
  console.log('starting save inteval')
  clearInterval(interval)
  return setInterval(() => {
    sync(upwell)
  }, timeout)
}

export async function sync(ours: Upwell): Promise<void> {
  let id = await ours.id()
  console.log('syncing with external')
  let binary = await remote.getItem(id)
  if (binary) {
    let theirs = await toUpwell(Buffer.from(binary))
    ours.merge(theirs)
    subscriber(ours)
  }
  await remote.setItem(id, await ours.toFile())
}