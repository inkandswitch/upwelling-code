const BASE = 'http://localhost:5000'

export function getURI(id: string): string {
  return `${BASE}/${id}`
}

export async function getItem (id: string, actorId?: string): Promise<Uint8Array> { 
  const response = await fetch(getURI(id))
  if (response.status !== 200) throw new Error('No saved draft for doc with id=' + id)
  const respbuffer = await response.arrayBuffer()
  if (respbuffer.byteLength === 0) throw new Error('No saved draft for doc with id=' + id)
  return new Uint8Array(respbuffer)
}

export async function setItem (id: string, binary: Uint8Array): Promise<Response> {
  return fetch(getURI(id), {
    body: binary,
    method: "post",
    headers: {
      "Content-Type": "application/octet-stream",
    }
  })
}

export async function deleteItem(id: string): Promise<Response> {
  let binary = ''
  return fetch(getURI(id), {
    body: binary,
    method: "post",
    headers: {
      "Content-Type": "application/octet-stream",
    }
  })
}