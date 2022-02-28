import { Author, Upwell, Layer } from '../src/index'
import { it } from 'mocha';
import { assert } from 'chai';
import { nanoid } from 'nanoid';

describe('upwell', () => {
  it('works', async () => {
    let d = await Upwell.create()
    let doc1 = (await d.layers())[0]
    doc1.insertAt(0, 'Hello bold plain italic whatever');
    doc1.mark('bold', "(5..9)", true)
    doc1.commit('Hello!');
  })

  it('create a basic comment', async () => {
    let d = await Upwell.create()
    let doc1 = (await d.layers())[0]
    doc1.insertAt(0, 'Hello bold plain italic whatever');
    let comment_id = 'abc123'
    let comment = {
      author: 'susan', 
      message: 'peanuts', 
      children: []
    }

    doc1.create_comment(comment_id, comment)

    doc1.mark('comment', "(5..9)", JSON.stringify({
      id: comment_id
    }))
    doc1.commit('Hello!');

    let _comment = doc1.get_comment(comment_id)
    assert.equals(_comment, comment)

  })
})
