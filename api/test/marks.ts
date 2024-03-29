import { createAuthorId, CommentState, Upwell } from '../src/index'
import { it } from 'mocha';
import { assert } from 'chai';

describe('upwell', () => {
  let author = { id: createAuthorId(), name: 'susan' }
  let d = Upwell.create({ author })
  d.createDraft('my draft')
  it('works', async () => {
    let doc1 = d.drafts()[0]
    doc1.insertAt(0, 'Hello bold plain italic whatever');
    doc1.mark('bold', "(5..9)", true)
    doc1.commit('Hello!');
  })

  it('create a basic comment', async () => {
    let doc1 = d.drafts()[0]
    let comment_id = 'abc123'
    let comment = {
      id: comment_id,
      author: author.id,
      message: 'peanuts',
      children: [],
      state: CommentState.OPEN
    }

    doc1.comments.insert(comment)

    doc1.mark('comment', "(3..8)", comment_id)
    doc1.commit('boop')

    let _comment = doc1.comments.get(comment_id)
    assert.deepEqual(_comment, comment)
  })

  it('creates a comment thread', async () => {
    let doc1 = d.drafts()[0]
    let marks = doc1.marks
    let commentMark = marks.find(m => m.type === 'comment')
    assert.ok(commentMark)
    let commentId = commentMark.value
    let comment = doc1.comments.get(commentId)
    assert.ok(comment)
    if (!comment) throw new Error('no comment')
    assert.equal(comment.children.length, 0)
    let child = doc1.comments.addChild('bananas', author.id, comment.id)
    comment = doc1.comments.get(commentId)

    assert.equal(comment?.children.length, 1)
    assert.deepEqual(doc1.comments.get(comment?.children[0]!)!, child)

  })
})
