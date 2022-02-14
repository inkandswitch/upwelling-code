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
    console.log(doc1.marks)
  })
})
