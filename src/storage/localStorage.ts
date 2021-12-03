import * as Automerge from 'automerge';
import { Document } from '../types';

let channels = new Map()

export const getChannel = (id: string) => {
  let broadcaster
  if (channels.has(id)) {
    broadcaster = channels.get(id)
  } else {
    broadcaster = new BroadcastChannel(id)
    channels.set(id, broadcaster)
  }
  return broadcaster
}

export const deleteItem = (id: string) => {
  localStorage.removeItem(id)
}

export const getDoc = (id: string) => {
  let saved = localStorage.getItem(id)
  if (saved) {
    let doc = JSON.parse(saved).doc
    return Uint8Array.from(Buffer.from(doc, 'base64'))
  }
  else return null
}

export const setDoc = (id: string, document: Automerge.Doc<any>) => {
  let binary = Automerge.save(document)
  let state = JSON.stringify({
    doc: Buffer.from(binary).toString('base64'),
    meta: {
      parent: document.parent,
      title: id
    }
  })

  getChannel(id).postMessage(state)
  localStorage.setItem(id, state)
}

export const list = (): Document[] => {
  let ids = Object.keys(localStorage)
  return ids.filter((id) => id.startsWith('sesh:')).map(id => {
    let val = localStorage.getItem(id)
    //@ts-ignore
    let item: Document = JSON.parse(val)
    return { meta: item.meta, id }
  })
}