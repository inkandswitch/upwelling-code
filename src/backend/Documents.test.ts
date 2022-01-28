import Documents from './Documents'
import * as Automerge from 'automerge'
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


it('saves and loads from a file', async () => {
  let storage = new memoryStore()
  let d = new Documents(storage)
  let e = new Documents(storage)

  let ddoc: UpwellingDoc = d.create('Upwelling: Collaboration Engine')
  let file = ddoc.save()
  let edoc = await e.add(file)

  ddoc.change((doc) => {
    doc.title = 'Upwelling: Contextual Writing'
  })

  let binary = ddoc.save()
  let edocAfterSync = await e.add(binary)
  expect(edocAfterSync.title).toEqual(ddoc.title)
})

it('creates named versions', async () => {
  let storage = new memoryStore()
  let d = new Documents(storage)
  let doc = d.create('Upwelling: Local-first Collaborative Writing')

  doc.change((doc: DocFields) => {
    doc.text.insertAt(0, 'H')
    doc.text.insertAt(1, 'e')
    doc.text.insertAt(2, 'l')
    doc.text.insertAt(3, 'l')
    doc.text.insertAt(4, 'o')
  })
  expect(doc.text).toEqual('Hello')

  let versionName = 'Started typing on the train' 
  doc.createVersion(versionName)
  d.persist(doc)

  doc.change((doc: DocFields) => {
    doc.text.insertAt(0, 'H')
    doc.text.deleteAt(1)
    doc.text.insertAt(1, 'o')
    doc.text.deleteAt(2)
    doc.text.deleteAt(3)
    doc.text.insertAt(3, 'a')
    doc.text.deleteAt(4)
  })
  expect(doc.text).toEqual('Hola')

  let versionName2 = 'Translated to spanish'
  doc.createVersion(versionName2)
  d.persist(doc)

  expect(doc.version.message).toEqual(versionName2)

  let history = doc.getVersionHistory()
  expect(history.length).toEqual(3)
  expect(history[0].version.message).toEqual('Document initialized')
  expect(history[1].version.message).toEqual(versionName)
  expect(history[2].version.message).toEqual(versionName2)

  let version2 = await d.get(history[1].version.id)
  expect(version2?.text).toEqual('Hello')
})

it('creates named versions with authors', async () => {
  let storage = new memoryStore()
  let d = new Documents(storage)
  let doc = d.create('Upwelling: Local-first Collaborative Writing')

  doc.change((doc: DocFields) => {
    doc.text.insertAt(0, 'H')
    doc.text.insertAt(1, 'e')
    doc.text.insertAt(2, 'l')
    doc.text.insertAt(3, 'l')
    doc.text.insertAt(4, 'o')
  })
  expect(doc.text).toEqual('Hello')

  let versionName = 'Started typing on the train' 
  let author = 'Theroux'
  doc.createVersion(versionName, { author })
  d.persist(doc)

  doc.change((doc: DocFields) => {
    doc.text.insertAt(0, 'H')
    doc.text.deleteAt(1)
    doc.text.insertAt(1, 'o')
    doc.text.deleteAt(2)
    doc.text.deleteAt(3)
    doc.text.insertAt(3, 'a')
    doc.text.deleteAt(4)
  })
  expect(doc.text).toEqual('Hola')

  let versionName2 = 'Translated to spanish'
  doc.createVersion(versionName2)
  d.persist(doc)

  expect(doc.version.message).toEqual(versionName2)

  let history = doc.getVersionHistory()
  expect(history.length).toEqual(3)
  expect(history[0].version.message).toEqual('Document initialized')
  expect(history[1].version.message).toEqual(versionName)
  expect(history[2].version.message).toEqual(versionName2)

  let version2 = await d.get(history[1].version.id)
  expect(version2?.text).toEqual('Hello')
})


it('add author name to a change', async () => {
  let storage = new memoryStore()
  let d = new Documents(storage)
  let doc = d.create('Upwelling: Local-first Collaborative Writing')

  let changeFn = (doc: DocFields) => {
    doc.text.insertAt(0, ['h', 'e', 'l', 'l', 'o'])
  }
  let opts = {
    author: 'Theroux'
  }
  doc.change(changeFn, opts)

  let history = Automerge.getHistory(doc.doc)
  console.log(JSON.parse(history[1].change.message))

  let objid = Automerge.getObjectId(doc.doc.text)
  let obj = Automerge.getObjectById(doc.doc, objid)
  console.log(obj)

})