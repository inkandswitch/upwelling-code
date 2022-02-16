import { Author, Upwell, Layer, Heads } from '../src/index'
import { it } from 'mocha';
import { assert } from 'chai';

async function helloWorld(): Promise<Upwell> {
  let upwell = await Upwell.create()
  let layers = await upwell.layers()
  let A = layers[0]
  A.insertAt(0, 'hello world')
  return upwell
}


describe('save and load', () => {
  it('serializes metadata and single layer', async () => {
    let a = await helloWorld()
    let binary = await a.serialize()
    // give binary to friend 
    let b = await Upwell.deserialize(binary)
    await upwellEquals(a, b)
  })

  it('merges all layers on an upwell', async () => {
    let a = await helloWorld()
    let binary = await a.serialize()
    // give binary to friend 
    let b = await Upwell.deserialize(binary)
    await upwellEquals(a, b)

    let layers = await a.layers()
    let author = "Jon Jacob Jingleheimer Schmidt"
    let newLayer = Layer.create("Thinking about new introduction", author, layers[0])
    await a.add(newLayer)

    let blayers = await b.layers()
    let bauthor = "Bon Bacob Bingleheimer Schmibt"
    let bnewLayer = Layer.create("Thinking about new introduction", bauthor, blayers[0])
    await b.add(bnewLayer)

    // give binary from a to b
    binary = await a.serialize()
    let c = await Upwell.deserialize(binary)
    await b.merge(c)

    let newLayers = await b.layers()
    assert.equal(newLayers.length, 3)
    assert.ok(newLayers.find(l => l.author === author))

    // give binary from b to a 
    binary = await b.serialize()
    c = await Upwell.deserialize(binary)
    await a.merge(c)
    await upwellEquals(a, b)
  })
})

async function upwellEquals(a, b) {
  assert.deepEqual(b.id, a.id)
  let b_meta = await b.metadata()
  let a_meta = await a.metadata()

  assert.deepEqual(b_meta.id, a_meta.id)
  assert.deepEqual(b_meta.main, a_meta.main)
  
  let layers_a = (await a.layers())
  let layers_b = (await b.layers())
  layers_a.forEach((la: Layer) => {
    let lb = layers_b.find(l => la.id === l.id)
    assert.ok(lb)
    layerEqual(la, lb)
  })

  layers_b.forEach((la: Layer) => {
    let lb = layers_a.find(l => la.id === l.id)
    assert.ok(lb)
    layerEqual(la, lb)
  })
}

function layerEqual(la, lb) {
  assert.deepEqual(lb.metadata, la.metadata)
  assert.deepEqual(lb.text, la.text)
  assert.deepEqual(lb.title, la.title)
  assert.deepEqual(lb.author, la.author)
}