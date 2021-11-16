import * as Automerge from 'automerge';

const BASE = 'http://localhost:5000'

export async function sync (id: string, ours: Automerge.Doc<any>): Promise<Automerge.Doc<any>> { 
  let document = ours
  try { 
    let doc = await getItem(id)
    //let changes = Automerge.getChanges(doc, ours)
    let newDoc = Automerge.merge(doc, ours)
    document = newDoc
  } catch (err) {
    console.log('error', err)
  }
  let response = await setItem(id, document)
  return document
}

export async function getItem (id: string, actorId?: string): Promise<Automerge.Doc<any>> { 
  const response = await fetch(`${BASE}/${id}`)
  if (response.status !== 200) throw new Error('No saved draft for doc with id=' + id)
  const respbuffer = await response.arrayBuffer()
  if (respbuffer.byteLength === 0) throw new Error('No saved draft for doc with id=' + id)
  const view = new Uint8Array(respbuffer)
  return Automerge.load(view as Automerge.BinaryDocument)
}

export async function setItem (id: string, doc: Automerge.Doc<any>): Promise<Response> {
  let binary = Automerge.save(doc)
  return fetch(`${BASE}/${id}`, {
    body: binary,
    method: "post",
    headers: {
      "Content-Type": "application/octet-stream",
    }
  })
}

export async function deleteItem(id: string): Promise<Response> {
  let binary = ''
  return fetch(`${BASE}/${id}`, {
    body: binary,
    method: "post",
    headers: {
      "Content-Type": "application/octet-stream",
    }
  })
}