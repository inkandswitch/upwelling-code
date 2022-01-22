import Documents from './Documents'
import { DocFields, UpwellingDoc } from './AutomergeDoc';

class memoryStore {
  store = new Map<string, Uint8Array>()

  async getItem (id: string): Promise<Uint8Array | undefined | null> {
    return this.store.get(id)
  }

  async setItem (id: string, binary: Uint8Array) : Promise<void> {
    this.store.set(id, binary)
  }

  async ids(): Promise<string[]> {
    return Array.from(this.store.keys())
  }
} 

it('subscribes to document changes', () => {
  let storage = new memoryStore()
  let d = new Documents(storage)

  let doc: UpwellingDoc = d.create('Upwelling: Collaboration Engine')

  let times = 0
  doc.subscribe((doc: DocFields) => {
    times++
    if (times === 1) expect(doc.text.toString()).toEqual('Hello')
    if (times === 2) expect(doc.text.toString()).toEqual('Hola')
  })

  doc.change((doc: DocFields) => {
    doc.text.insertAt(0, 'H')
    doc.text.insertAt(1, 'e')
    doc.text.insertAt(2, 'l')
    doc.text.insertAt(3, 'l')
    doc.text.insertAt(4, 'o')
  })

  doc.change((doc: DocFields) => {
    doc.text.insertAt(0, 'H')
    doc.text.deleteAt(1)
    doc.text.insertAt(1, 'o')
    doc.text.deleteAt(2)
    doc.text.deleteAt(3)
    doc.text.insertAt(3, 'a')
    doc.text.deleteAt(4)
  })

  expect(1).toEqual(1)
})

