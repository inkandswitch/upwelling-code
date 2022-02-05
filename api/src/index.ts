import { Upwell }  from './Upwell'
import init from 'automerge-wasm'
import * as local from './storage/localStorage'
import * as http from './storage/http'
export * from './Upwell'
export * from './Layer'

let upwell: Upwell
export async function loadForTheFirstTimeLoL() {
  return new Promise<void>((resolve, reject) => {
    init().then(() => {
      upwell = new Upwell('Untitled document', { fs: local, remote: http })
      resolve()
    })
  })
}

export default function () {
  return upwell
}
