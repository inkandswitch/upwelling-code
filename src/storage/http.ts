import * as Automerge from 'automerge';

const BASE = 'http://localhost:5000'

export async function getItem (id: string): Promise<Automerge.BinaryDocument> { 
  const response = await fetch(`${BASE}/${id}`)
  if (response.status !== 200) throw new Error('No saved draft for doc with id=' + id)
  const respbuffer = await response.arrayBuffer()
  const view = new Uint8Array(respbuffer)
  return view as Automerge.BinaryDocument
}

export async function setItem (id: string, doc: Automerge.Doc<any>): Promise<void> {
  const binary = Automerge.save(doc)
  const response = await fetch(`${BASE}/${id}`, {
    body: binary ,
    method: "post",
    headers: {
      "Content-Type": "application/octet-stream",
    }
  })
  console.log(response)
}
