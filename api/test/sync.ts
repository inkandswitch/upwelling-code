import { Author, Upwell, Layer, Heads } from '../src/index'
import { it } from 'mocha';
import { assert } from 'chai';

function helloWorld(): Upwell {
  let upwell = Upwell.create()
  let layers = upwell.layers()
  let A = layers[0]
  A.insertAt(0, 'hello world')
  return upwell
}


describe('save and load', () => {
  it('serializes metadata and single layer', async () => {
    let a = helloWorld()
    let binary = await a.serialize()
    // give binary to friend 
    let b = await Upwell.deserialize(binary)
    upwellEquals(a, b)
  })

  it('merges all layers on an upwell', async () => {
    let a = helloWorld()
    let binary = await a.serialize()
    // give binary to friend 
    let b = await Upwell.deserialize(binary)
    upwellEquals(a, b)

    let layers = a.layers()
    let author = "Jon Jacob Jingleheimer Schmidt"
    let newLayer = layers[0].fork("Thinking about new introduction", author)
    a.add(newLayer)

    let blayers = b.layers()
    let bauthor = "Bon Bacob Bingleheimer Schmibt"
    let bnewLayer = blayers[0].fork("Thinking about new introduction", bauthor)
    b.add(bnewLayer)

    // give binary from a to b
    binary = await a.serialize()
    let c = await Upwell.deserialize(binary)
    b.merge(c)

    let newLayers = b.layers()
    assert.equal(newLayers.length, 3)
    assert.ok(newLayers.find(l => l.author === author))

    // give binary from b to a 
    binary = await b.serialize()
    c = await Upwell.deserialize(binary)
    a.merge(c)
    upwellEquals(a, b)
  })

  describe('100 layers with 3 paragraphs of text', () => {
    let stream: any = null
    let upwell = Upwell.create()
    const text = 'Past user research has taught us that writers and editors have complex relationships which vary from institution to institution and even from project to project. There is a consistent theme in our user research: people want to decide when, how, and with whom they share their work, and they want to be deliberate and conscious about edits made by others. Many report stress when they feel someone else is looking over their shoulder while editing or writing. When another person is writing in the same document, sometimes the interface will adjust and move as they are interacting with it. Many report that **it can be distracting and interrupt the creative process when too much is happening in a document**. Although not every project is the same, we do find some common themes that lead us to believe that the most popular design paradigms for collaborative editing just aren’t as good as they could be. Today, people create clever workarounds within existing tools to get their desired behavior. For example, they might copy-paste the document contents into another application altogether, duplicate the document for edits, or tell a contributor to edit a particular section and send it to back in a new document. A problem with this multi-document method is that if another user were to modify the source document in the meantime, those edits would be lost when the document is pasted together. Typically, a person or a team is tasked with maintaining the semantic meaning of the document. This involves some decision-making about which edits should be integrated into the final document, which is often a tedious process involving manual labor. How can we build tools that support these collaborative editing workflows? In this work, we focus on non-fiction writing, and exclude fiction, code, images, videos, or other content types that could also be subject to collaborative editing. Although some of these primitives may transfer, we wanted to scope the project to be a bit more specific to explore some of these ideas and test them with real users, which would have been a much longer project had we included other content types. We already understand from our user research and professional experience on the team that fiction writing, in particular, brings forth different editing patterns and team dynamics than that of non-fiction. In future work, we’d be interested in attempting to apply these ideas to other content types.' 

    it('serializes in less than two seconds', async () => {
      let layer = Layer.create('New layer', 'author')
      let createLayer = () => {
        let l = layer.fork('boop', 'beep')
        upwell.add(l)
        layer.insertAt(0, 'boop')
      }
  
      for (let i = 0; i < 100; i++) {
        createLayer()
      }
  
      let start = new Date()
      stream = await upwell.serialize()
      //@ts-ignore
      let end = new Date() - start
      assert.isBelow(end, 1 * 2000) // 2sec

    })

    it('deserializes in less than one second ', async () => {
      let start = new Date()
      upwell = await Upwell.deserialize(stream)
      //@ts-ignore
      let end = new Date() - start
      assert.isBelow(end, 1 * 2000) // 2sec
    })

    let deserialized: Upwell
    it('lazy loads archived', async () => {
      let layers = upwell.layers()
      let i = 0
      for (let layer of layers) {
        if (i % 2 === 0) upwell.archive(layer.id)
        i++
      }
      stream = await upwell.serialize()

      deserialized = await Upwell.deserialize(stream)
      assert.equal(deserialized.layers().length, 50)
    })

    it('getArchivedLayers', async () => {
      let generator = deserialized.getArchivedLayers()
      let archived = 0
      for (const layer of generator) {
        archived++
        assert.equal(upwell.isArchived(layer.id), true)
      }
      assert.equal(archived, 50)
    })
  })
})

async function upwellEquals(a, b) {
  a.hydrate()
  b.hydrate()
  assert.deepEqual(b.id, a.id)
  let b_meta = b.metadata
  let a_meta = a.metadata

  assert.deepEqual(b_meta.id, a_meta.id)
  assert.deepEqual(b_meta.main, a_meta.main)
  
  let layers_a = a.layers()
  let layers_b = b.layers()
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