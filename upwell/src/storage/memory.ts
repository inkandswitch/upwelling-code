
export class memoryStore {
  store = new Map<string, Uint8Array>()

  async getItem(id: string): Promise<Uint8Array | undefined | null> {
    return this.store.get(id)
  }

  async setItem(id: string, binary: Uint8Array): Promise<void> {
    this.store.set(id, binary)
  }

  async ids(): Promise<string[]> {
    return Array.from(this.store.keys())
  }
}
