
export class memoryStore {
  store = new Map<string, Uint8Array>()

  getItem(id: string): Uint8Array | undefined | null {
    return this.store.get(id)
  }

  setItem(id: string, binary: Uint8Array): void {
    this.store.set(id, binary)
  }

  ids(): string[] {
    return Array.from(this.store.keys())
  }
}
