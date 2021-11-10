import * as Automerge from 'automerge';

export const getItem = (id: string) => {
  let saved = localStorage.getItem(id)
  if (saved) return new Uint8Array(Buffer.from(saved, 'hex'))
}

export const setItem = (id: string, document: Automerge.Doc<any>) => {
  let binary = Automerge.save(document)
  localStorage.setItem(id, Buffer.from(binary).toString('hex'))
}