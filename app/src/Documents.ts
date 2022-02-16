import { Upwell } from 'api';
import FS from './storage/localStorage'
import concat from 'concat-stream'

let upwells: Map<string, Upwell> = new Map<string, Upwell>();
let storage = new FS('upwell-')

let interval: any = null

export async function create () {
  let upwell = await Upwell.create()
  let id = await upwell.id()
  await save(upwell)
  upwells.set(id, upwell)
  return upwell
}

export async function get(id: string): Promise<Upwell> {
  return new Promise(async (resolve, reject) => {
    let upwell = upwells.get(id)
    if (upwell) return resolve(upwell)
    let binary = storage.getItem(id)
    if (!binary) return reject(new Error('item does not exist with id=' + id))
    resolve(await Upwell.fromFile(binary))
  })
}

export async function save(upwell: Upwell): Promise<void> {
  return new Promise(async (resolve, reject) => {
    let toBinaryStream = concat(async (binary: Buffer) => {
      let id = await upwell.id()
      console.log('saving', id)
      storage.setItem(id, binary)
      resolve()
    })

    let readStream = await upwell.serialize()
    readStream.pipe(toBinaryStream)
  }) 
}

export function stopSaveInterval () {
  clearInterval(interval)
}

export function startSaveInterval (upwell: Upwell, timeout = 3000) {
  return setInterval(() => {
    save(upwell)
  }, timeout)
}