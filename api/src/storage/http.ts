export default class HTTP {
  BASE: string = 'http://localhost:5000'

  constructor(url?: string) {
    if (url) this.BASE = url
  }

  async ids(): Promise<string[]> {
    throw new Error('unimplemented')
  }

  async getItem (id: string, actorId?: string): Promise<ArrayBuffer> { 
    const response = await fetch(this.getURI(id))
    if (response.status !== 200) throw new Error('No saved draft for doc with id=' + id)
    return response.arrayBuffer()
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