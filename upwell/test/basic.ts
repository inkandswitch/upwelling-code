import { Upwell, UpwellingDoc } from '../src/index'
import { it } from 'mocha';
import assert from 'assert';

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

it.only('subscribes to document changes', () => {
  let storage = new memoryStore()
  let d = new Upwell(storage)
  console.log('boop')

  let doc: UpwellingDoc = d.create()
  console.log('created')

  let times = 0
  doc.subscribe((doc: UpwellingDoc) => {
    times++
    if (times === 1) assert(doc.text === 'Hello')
    if (times === 2) assert(doc.text === 'Hola')
  })

  doc.insertAt(0, 'H')
  doc.insertAt(1, 'e')
  doc.insertAt(2, 'l')
  doc.insertAt(3, 'l')
  doc.insertAt(4, 'o')
  doc.createVersion('Added hello', 'john')

  doc.insertAt(0, 'H')
  doc.deleteAt(1)
  doc.insertAt(1, 'o')
  doc.deleteAt(2)
  doc.deleteAt(3)
  doc.insertAt(3, 'a')
  doc.deleteAt(4)
  doc.createVersion('Translated to Spanish', 'jose')

})


it('saves and loads from a file', async () => {
  let storage = new memoryStore()
  let d = new Upwell(storage)
  let e = new Upwell(storage)

  let ddoc: UpwellingDoc = d.create()
  let file = ddoc.save()
  let edoc = await e.add(file)

  ddoc.title = 'Upwelling: Contextual Writing'

  let binary = ddoc.save()
  let edocAfterSync = await e.add(binary)
  assert(edocAfterSync.title === ddoc.title)
})

it('creates named versions', async () => {
  let storage = new memoryStore()
  let d = new Upwell(storage)
  let doc = d.create()

  doc.insertAt(0, 'H')
  doc.insertAt(1, 'e')
  doc.insertAt(2, 'l')
  doc.insertAt(3, 'l')
  doc.insertAt(4, 'o')
  assert(doc.text === 'Hello')

  let versionName = 'Started typing on the train' 
  let author = 'John'
  doc.createVersion(versionName, author)
  d.persist(doc)

  doc.insertAt(0, 'H')
  doc.deleteAt(1)
  doc.insertAt(1, 'o')
  doc.deleteAt(2)
  doc.deleteAt(3)
  doc.insertAt(3, 'a')
  doc.deleteAt(4)
  //assert(doc.text === 'Hola')

  let versionName2 = 'Translated to spanish'
  let author2 = 'Bono'
  doc.createVersion(versionName2, author2)
  d.persist(doc)

  assert(doc.message === versionName2)

  /*
  let history = doc.getVersionHistory()
  expect(history.length).toEqual(3)
  expect(history[0].version.message).toEqual('Document initialized')
  expect(history[1].version.message).toEqual(versionName)
  expect(history[2].version.message).toEqual(versionName2)


  let version2 = await d.get(history[1].version.id)
  expect(version2?.text).toEqual('Hello')
  */
})

it('creates named versions with authors', async () => {
  let storage = new memoryStore()
  let d = new Upwell(storage)
  let doc = d.create()
  doc.title = 'Upwelling: Local-first Collaborative Writing'

  doc.insertAt(0, 'H')
  doc.insertAt(1, 'e')
  doc.insertAt(2, 'l')
  doc.insertAt(3, 'l')
  doc.insertAt(4, 'o')
  assert(doc.text === 'Hello')

  let versionName = 'Started typing on the train' 
  let author = 'Theroux'
  doc.createVersion(versionName, author)
  d.persist(doc)

  doc.insertAt(0, 'H')
  doc.deleteAt(1)
  doc.insertAt(1, 'o')
  doc.deleteAt(2)
  doc.deleteAt(3)
  doc.insertAt(3, 'a')
  doc.deleteAt(4)
  //assert(doc.text === 'Hola')

  let versionMessage2 = 'Translated to spanish'
  let author2 = 'Daba'
  doc.createVersion(versionMessage2, author)
  d.persist(doc)

  assert(doc.message === versionMessage2)

  /*
  let history = doc.getVersionHistory()
  expect(history.length).toEqual(3)
  expect(history[0].version.message).toEqual('Document initialized')
  expect(history[1].version.message).toEqual(versionName)
  expect(history[2].version.message).toEqual(versionName2)

  let version2 = await d.get(history[1].version.id)
  expect(version2?.text).toEqual('Hello')
  */

})

