import * as Automerge from 'automerge';
import { ListItem } from '../types';

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
  localStorage.setItem(id, JSON.stringify({
    doc: Buffer.from(binary).toString('base64'),
    meta: {
      parent: document.parent,
      title: document.title.toString()
    }
  }))
}

export const list = (): ListItem[] => {
  let ids = Object.keys(localStorage)
  return ids.filter((id) => id.startsWith('sesh:')).map(id => {
    let val = localStorage.getItem(id)
    //@ts-ignore
    let item: ListItem = JSON.parse(val)
    return { meta: item.meta, id }
  })
}