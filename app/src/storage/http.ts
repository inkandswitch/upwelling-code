export default class HTTP {
  BASE: string = 'http://localhost:5001'

  constructor(url?: string) {
    if (url) this.BASE = url
  }

  async ids(): Promise<string[]> {
    throw new Error('unimplemented')
  }

  async getItem(id: string, actorId?: string): Promise<ArrayBuffer | null> {
    try {
      const response = await fetch(this.getURI(id))
      if (response.status === 200) return response.arrayBuffer()
      else return null
    } catch (err) {
      return null
    }
  }

  async setItem(id: string, binary: Uint8Array): Promise<Response> {
    let form = new FormData()
    form.append(id, new Blob([binary]))
    return fetch(this.getURI(id), {
      body: form,
      method: 'post',
    })
  }

  async deleteItem(id: string): Promise<Response> {
    let binary = ''
    return fetch(this.getURI(id), {
      body: binary,
      method: 'post',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    })
  }
  getURI(id: string): string {
    return `${this.BASE}/${id}`
  }
}
