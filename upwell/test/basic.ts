import { Upwell, Layer } from '../src/index'
import { it } from 'mocha';
import { assert } from 'chai';

describe('upwell', () => {
  it('subscribes to document changes', async () => {
    let d = new Upwell('Upwell: collaboration engine')
    let layers = await d.layers()
    assert.lengthOf(layers, 1)

    let doc: Layer = Layer.create('New layer', layers[0])
    await d.add(doc)
    assert.lengthOf(await d.layers(), 2)

    let times = 0
    doc.subscribe((doc: Layer) => {
      times++
      if (times === 1) assert.equal(doc.text, 'Hello')
      if (times === 2) assert.equal(doc.text, 'Hola')
    })

    doc.insertAt(0, 'H')
    doc.insertAt(1, 'e')
    doc.insertAt(2, 'l')
    doc.insertAt(3, 'l')
    doc.insertAt(4, 'o')
    doc.commit('Added hello')

    doc.insertAt(0, 'H')
    doc.deleteAt(1)
    doc.insertAt(1, 'o')
    doc.deleteAt(2)
    doc.deleteAt(3)
    doc.insertAt(3, 'a')
    doc.deleteAt(4)
    doc.commit('Translated to Spanish')
  })

  it('saves and loads from a file', async () => {
    let d = new Upwell('Upwelling')
    let e = new Upwell('Upwell')

    let layers = await d.layers()
    let ddoc = layers[0]
    let file = ddoc.save()
    let edoc = Layer.load(file)
    await e.add(edoc)

    ddoc.title = 'Upwelling: Contextual Writing'

    let binary = ddoc.save()
    let layer = Layer.load(binary)
    await e.add(layer)
    assert.equal(layer.title, ddoc.title)
  })


  it('creates layers with authors', async () => {
    let d = new Upwell('Upwelling: Local-first Collaborative Writing')
    let layers = await d.layers()
    
    let doc = layers[0]

    doc.insertAt(0, 'H')
    doc.insertAt(1, 'e')
    doc.insertAt(2, 'l')
    doc.insertAt(3, 'l')
    doc.insertAt(4, 'o')
    assert.equal(doc.text, 'Hello')

    let versionName = 'Started typing on the train'
    let author = 'Theroux'
    doc.commit(versionName)
    d.persist(doc)

    doc.insertAt(0, 'H')
    doc.deleteAt(1)
    doc.insertAt(1, 'o')
    doc.deleteAt(2)
    doc.deleteAt(3)
    doc.insertAt(3, 'a')
    doc.deleteAt(4)
    //assert(doc.text === 'Hola')


  })

})