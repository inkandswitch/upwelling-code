
export default class HTTP {
  BASE: string = 'http://localhost:5000'
  constructor(url?: string) {
    this.BASE = url
  }

  async ids(): Promise<string[]> {
    throw new Error('unimplemented')
  }

  async getItem (id: string, actorId?: string): Promise<Uint8Array> { 
    const response = await fetch(this.getURI(id))
    if (response.status !== 200) throw new Error('No saved draft for doc with id=' + id)
    const respbuffer = await response.arrayBuffer()
    if (respbuffer.byteLength === 0) throw new Error('No saved draft for doc with id=' + id)
    return new Uint8Array(respbuffer)
  }

  async setItem (id: string, binary: Uint8Array): Promise<void> {
    fetch(this.getURI(id), {
      body: binary,
      method: "post",
      headers: {
        "Content-Type": "application/octet-stream",
      }
    })
  }

  async deleteItem(id: string): Promise<Response> {
    let binary = ''
    return fetch(this.getURI(id), {
      body: binary,
      method: "post",
      headers: {
        "Content-Type": "application/octet-stream",
      }
    })
  }
  getURI(id: string): string {
    return `${this.BASE}/${id}`
  }

}