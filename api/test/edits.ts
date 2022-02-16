import { Author, Upwell, Layer } from '../src/index'
import { it } from 'mocha';
import { assert } from 'chai';
import { nanoid } from 'nanoid';

describe('upwell', () => {

  let doc1: Layer, doc2: Layer

  beforeEach(async () => {
    let d = await Upwell.create()
    doc1 = (await d.layers())[0]
    doc1.insertAt(0, 'Hello of course');
    doc1.commit('Hello!');

    doc2 = Layer.create('Fork layer', 'editor', doc1)
    await d.add(doc2)

    doc2.insertAt(5, ' World');
    doc2.insertAt(0, 'Hey Everybody - ');
    doc2.deleteAt(16, 6)
    doc2.commit('I hope you like my changes!')
  })

  it('has the correct base documents', () => {
    assert.equal(doc1.text, 'Hello of course')
    assert.equal(doc2.text, 'Hey Everybody - World of course')
  })

  describe('getEdits', () => {

    let edits = []

    describe('with (root, modified) document order', () => {
      beforeEach(() => {
        edits = doc1.getEdits(doc2)
      });

      it('generates the correct number of edits', () => {
        assert.equal(edits.length, 5)
      })

      it('generates the correct edits', () => {
        assert.deepEqual({ type: 'delete', start: 0, value: 'Hello' }, edits[0])
        assert.deepEqual({ type: 'insert', start: 0, value: 'Hey' }, edits[1])
        assert.deepEqual({ type: 'retain', start: 3, value: ' ' }, edits[2])
        assert.deepEqual({ type: 'insert', start: 4, value: 'Everybody - World ' }, edits[3])
        assert.deepEqual({ type: 'retain', start: 22, value: 'of course' }, edits[4])
      })

      it('covers the entire modified text', () => {
        let fullText = edits.reduce((text, edit) => {
          if (edit.type === 'insert' || edit.type === 'retain') {
            return text + edit.value
          } else {
            return text
          }
        }, '')
        assert.equal(fullText, doc2.text)
      })
    })

    describe('with (modified, root) document order', () => {
      beforeEach(() => {
        edits = doc2.getEdits(doc1)
      });

      it('generates the correct number of edits', () => {
        assert.equal(edits.length, 5)
      })

      it('generates the correct edits', () => {
        assert.deepEqual({ type: 'delete', start: 0, value: 'Hey' }, edits[0])
        assert.deepEqual({ type: 'insert', start: 0, value: 'Hello' }, edits[1])
        assert.deepEqual({ type: 'retain', start: 5, value: ' ' }, edits[2])
        assert.deepEqual({ type: 'delete', start: 6, value: 'Everybody - World ' }, edits[3])
        assert.deepEqual({ type: 'retain', start: 6, value: 'of course' }, edits[4])
      })

      it('covers the entire modified text', () => {
        let fullText = edits.reduce((text, edit) => {
          if (edit.type === 'insert' || edit.type === 'retain') {
            return text + edit.value
          } else {
            return text
          }
        }, '')
        assert.equal(fullText, doc1.text)
      })
    })
  })

  describe('mergeWithEdits', () => {

    let merged: Layer

    beforeEach(async () => {
      merged = Layer.mergeWithEdits(doc1, doc2)
    })

    describe('with a single layer', () => {

      it('has the correct number of marks', () => {
        assert.equal(merged.marks.length, 3)
      })

      it('preserves changes as marks', () => {

        let marks = merged.marks.map(({type, start, end}) => ({ type, start, end }))

        assert.deepEqual([
          { type: 'delete', start: 0, end: 5 },
          { type: 'insert', start: 0, end: 3 },
          { type: 'insert', start: 4, end: 22 }
        ], marks)
      })

      it('retains metadata', () => {
        let marksValues = merged.marks.map(mark => {
          return mark.value
        })

        assert.deepEqual([
          JSON.stringify({author: 'editor'}),
          JSON.stringify({author: 'editor'}),
          JSON.stringify({author: 'editor'}),
        ], marksValues)
      })
    })

    describe.skip('with multiple layers', () => {
      it('correctly modifies the marks', () => {
      })
    })
  })
})
