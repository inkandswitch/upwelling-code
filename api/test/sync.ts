import { createAuthorId, Author, Upwell, Draft, Heads } from '../src/index'
import { it } from 'mocha';
import { assert } from 'chai';

function helloWorld(): Upwell {
  let upwell = Upwell.create()
  let drafts = upwell.drafts()
  let A = drafts[0]
  A.insertAt(0, 'hello world')
  return upwell
}

describe('save and load', () => {
  let author = {
    id: createAuthorId(),
    name: 'Susan'
  }
  it('serializes metadata and single draft', async () => {
    let a = helloWorld()
    let binary = await a.serialize()
    // give binary to friend 
    let b = await Upwell.deserialize(binary, author)
    upwellEquals(a, b)
  })

  it('merges all drafts on an upwell', async () => {
    let a = helloWorld()
    let binary = await a.serialize()
    // give binary to friend 
    let b = await Upwell.deserialize(binary, author)
    upwellEquals(a, b)

    let drafts = a.drafts()
    let author2 = { id: createAuthorId(), name: "Jon Jacob Jingleheimer Schmidt" }
    let newDraft = drafts[0].fork("Thinking about new introduction", author2)
    a._add(newDraft)

    let bdrafts = b.drafts()
    let bauthor = { id: createAuthorId(), name: "Bon Bacob Bingleheimer Schmibt" }
    let bnewDraft = bdrafts[0].fork("Thinking about new introduction", bauthor)
    b._add(bnewDraft)

    // give binary from a to b
    binary = await a.serialize()
    let c = await Upwell.deserialize(binary, author)
    b.merge(c)

    let newDrafts = b.drafts()
    assert.equal(newDrafts.length, 3)
    assert.ok(newDrafts.find(l => l.authorId === author2.id))

    // give binary from b to a 
    binary = await b.serialize()
    c = await Upwell.deserialize(binary, author)
    a.merge(c)
    assert.equal(b.drafts().length, 3)
    upwellEquals(a, b)
  })

  it.skip('recovers from merging unknown draft', async () => {
    let a_author: Author = { id: createAuthorId(), name: "Susan" };
    let a = Upwell.create({ author: a_author });

    let b_author: Author = { id: createAuthorId(), name: "Joe" };
    let b = Upwell.create({ author: b_author });


    let draft = a.createDraft()
    a.rootDraft = draft
    let c = await Upwell.deserialize(await a.serialize(), b_author)
    b.merge(c)

    assert.equal(b.rootDraft.id, draft.id)

    assert.equal(b.drafts().length, a.drafts.length)

  })

  describe('100 drafts with 3 paragraphs of text', () => {
    let stream: any = null
    let upwell = Upwell.create()
    const NUM = 100
    const text = 'Past user research has taught us that writers and editors have complex relationships which vary from institution to institution and even from project to project. There is a consistent theme in our user research: people want to decide when, how, and with whom they share their work, and they want to be deliberate and conscious about edits made by others. Many report stress when they feel someone else is looking over their shoulder while editing or writing. When another person is writing in the same document, sometimes the interface will adjust and move as they are interacting with it. Many report that **it can be distracting and interrupt the creative process when too much is happening in a document**. Although not every project is the same, we do find some common themes that lead us to believe that the most popular design paradigms for collaborative editing just aren’t as good as they could be. Today, people create clever workarounds within existing tools to get their desired behavior. For example, they might copy-paste the document contents into another application altogether, duplicate the document for edits, or tell a contributor to edit a particular section and send it to back in a new document. A problem with this multi-document method is that if another user were to modify the source document in the meantime, those edits would be lost when the document is pasted together. Typically, a person or a team is tasked with maintaining the semantic meaning of the document. This involves some decision-making about which edits should be integrated into the final document, which is often a tedious process involving manual labor. How can we build tools that support these collaborative editing workflows? In this work, we focus on non-fiction writing, and exclude fiction, code, images, videos, or other content types that could also be subject to collaborative editing. Although some of these primitives may transfer, we wanted to scope the project to be a bit more specific to explore some of these ideas and test them with real users, which would have been a much longer project had we included other content types. We already understand from our user research and professional experience on the team that fiction writing, in particular, brings forth different editing patterns and team dynamics than that of non-fiction. In future work, we’d be interested in attempting to apply these ideas to other content types.'

    it('serializes in less than two seconds', async () => {
      upwell.createDraft('New draft')
      for (let i = 0; i < NUM; i++) {
        upwell.createDraft()
      }

      let start = new Date()
      stream = await upwell.serialize()
      //@ts-ignore
      let end = new Date() - start
      assert.isBelow(end, 1 * 2000) // 2sec

    })

    it('deserializes in less than one second ', async () => {
      let start = new Date()
      upwell = await Upwell.deserialize(stream, author)
      //@ts-ignore
      let end = new Date() - start
      assert.isBelow(end, 1 * 2000) // 2sec
    })

    it('lazy loads archived', async () => {
      let deserialized: Upwell
      let drafts = upwell.drafts()
      let i = 1
      for (let draft of drafts) {
        if (i % 2 === 0) {
          upwell.archive(draft.id)
        }
        i++
      }
      stream = await upwell.serialize()

      deserialized = await Upwell.deserialize(stream, author)
      assert.equal(deserialized.drafts().length, NUM / 2 + 1)
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

  let drafts_a = a.drafts()
  let drafts_b = b.drafts()
  drafts_a.forEach((la: Draft) => {
    let lb = drafts_b.find(l => la.id === l.id)
    assert.ok(lb)
    draftEqual(la, lb)
  })

  drafts_b.forEach((la: Draft) => {
    let lb = drafts_a.find(l => la.id === l.id)
    assert.ok(lb)
    draftEqual(la, lb)
  })
}

function draftEqual(la, lb) {
  assert.deepEqual(lb.metadata, la.metadata)
  assert.deepEqual(lb.text, la.text)
  assert.deepEqual(lb.title, la.title)
  assert.deepEqual(lb.author, la.author)
}