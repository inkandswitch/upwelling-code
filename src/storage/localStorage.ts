import * as Automerge from 'automerge';

export const getItem = (id: string) => {
  let saved = localStorage.getItem(id)
  if (saved) return Uint8Array.from(Buffer.from(saved, 'base64'))
  else return null
}

export const setItem = (id: string, document: Automerge.Doc<any>) => {
  let binary = Automerge.save(document)
  localStorage.setItem(id, Buffer.from(binary).toString('base64'))
}