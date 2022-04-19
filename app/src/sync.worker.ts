import FS from './storage/localStorage'
import intoStream from 'into-stream'
import HTTP from './storage/http'
import { Upwell, createAuthorId, loadForTheFirstTimeLoL } from 'api'
require('setimmediate')

const STORAGE_URL = process.env.STORAGE_URL
let storage = new FS('upwell-')
let remote = new HTTP(STORAGE_URL)

function toUpwell(binary: any) {
  let stream = intoStream(binary)
  return Upwell.deserialize(stream, { id: createAuthorId(), name: 'system' })
}


onmessage = function (e) {
  loadForTheFirstTimeLoL()
  const { method, params } = e.data
  console.log('Message received from main script', method, params)
  switch (method) {
    case 'sync':
      sync(params.id, params.filename)
        .then(() => {
          console.log('Posting message back to main script')
          postMessage({
            method: 'sync-complete',
            params: {
              id: params.id
            }
          })
        })
        .catch((err) => {
          console.error('Got error in worker:', err)
        })
      break
    default:
      console.log('no message with', e)
      break
  }
}

async function sync(id: string, filename: string) {
  let local = await storage.getItem(id)
  let remoteBinary = await remote.getItem(id)
  if (!local && remoteBinary) {
    console.log('syncing from remote')
    let buf = Buffer.from(remoteBinary)
    await storage.setItem(id, buf)
    remote.setItem(id, buf, filename)
  } else if (!remoteBinary && local) {
    console.log('setting remote')
    return remote.setItem(id, local, filename)
  } else if (local && remoteBinary) {
    console.log('merging ')
    let buf = Buffer.from(remoteBinary)
    // do sync
    let inMemory = await toUpwell(local)
    let theirs = await toUpwell(buf)
    // update our local one
    inMemory.merge(theirs)
    let newFile = await inMemory.toFile()
    await storage.setItem(id, newFile)
    return remote.setItem(id, newFile, filename)
  }
}
