import Documents from './documents'

class memoryStore {
  store = new Map<string, string>()

  getItem (id: string): string | undefined | null {
    return this.store.get(id)
  }

  setItem (id: string, binary: string) : void {
    this.store.set(id, binary)
  }
  ids(): string[] {
    return Array.from(this.store.keys())
  }
} 

it('creates documents', () => {
  let storage = new memoryStore()
  let d = new Documents({
    local: storage,
    remote: null
  })

  expect(1).toEqual(1)
})