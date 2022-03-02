import { Edit, Author, Upwell, Layer } from '../src/index'
import { it } from 'mocha';
import { assert } from 'chai';
import { nanoid } from 'nanoid';

describe('edits', () => {

  let doc1: Layer, doc2: Layer, doc3: Layer

  beforeEach(async () => {
    let d = await Upwell.create({author: 'author'})
    doc1 = (await d.layers())[0]
    doc1.insertAt(0, 'Hello of course');
    doc1.commit('Hello!');

    doc2 = doc1.fork('Fork layer', 'editor')
    await d.add(doc2)

    doc2.insertAt(5, ' World');
    doc2.insertAt(0, 'Hey Everybody - ');
    doc2.deleteAt(16, 6)
    doc2.commit('I hope you like my changes!')

    doc3 = doc1.fork('Additional forked layer', 'editor 2')
    await d.add(doc3)

    doc3.insertAt(15, ' NEW LAYER');
    doc3.insertAt(0, 'NEW LAYER ');
    doc3.deleteAt(16, 3)
  })

  it('has the correct base documents', () => {
    assert.equal(doc1.text, 'Hello of course')
    assert.equal(doc2.text, 'Hey Everybody - World of course')
    assert.equal(doc3.text, 'NEW LAYER Hello course NEW LAYER')
  })

  describe('getEdits', () => {

    let edits: Edit[] = []

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

    describe('with two layers', () => {

      it('has the correct number of marks', () => {
        assert.equal(merged.marks.length, 3)
      })

      it('preserves changes as marks', () => {

        let marks = merged.marks.map(({type, start, end}) => ({ type, start, end }))

        assert.deepEqual([
          { type: 'delete', start: 0, end: 0 },
          { type: 'insert', start: 0, end: 3 },
          { type: 'insert', start: 4, end: 22 }
        ], marks)
      })

      it('retains metadata', () => {
        let marksValues = merged.marks.map(mark => {
          return mark.value
        })

        assert.deepEqual([
          JSON.stringify({author: 'editor', text: 'Hello'}),
          JSON.stringify({author: 'editor', text: 'Hey'}),
          JSON.stringify({author: 'editor', text: 'Everybody - World '}),
        ], marksValues)
      })
    })

    describe('with three layers', () => {
      let merged123;

      describe('linear merge', () => {

        // this is a contrived example because this approach would only allow
        // us to merge together layers that have *not* been updated to the most
        // recent root. See parallel merge below for the more realistic scenario.

        beforeEach(() => {
          let merged12 = Layer.mergeWithEdits(doc1, doc2)
          merged123 = Layer.mergeWithEdits(merged12, doc3)
        })

        it('has the correct number of marks', () => {
          assert.equal(merged123.marks.length, 15)
        })

        it('has the correct text', () => {
          assert.equal(merged123.text, 'NEW LAYER Hey Everybody - World course NEW LAYER')
        })

        describe('previously created marks', () => {
          let marks;

          beforeEach(() => {
            marks = merged123.marks.filter(m => JSON.parse(m.value).author === 'editor')
          })

          it('has the correct number of marks', () => {
            assert.equal(marks.length, 3)
          })

          it('correctly modifies existing marks', () => {
            let mks = marks.map(({type, start, end}) => ({ type, start, end }))

            assert.deepEqual([
              { type: 'delete', start: 0, end: 0 },
              { type: 'insert', start: 10, end: 13 },
              { type: 'insert', start: 14, end: 32 }
            ], mks)
          })

          it('modified marks cover the correct text', () => {
            marks.forEach(mark => {
              // deletions are zero-length; tested in the 'correctly modifies existing marks' test above
              if (mark.type === 'delete') return

              // this is a special case where an insertion mark is now
              // zero-length because the inserted text has been deleted.
              if (mark.start === mark.end) return
              assert.equal(JSON.parse(mark.value).text, merged123.text.substring(mark.start, mark.end))
            })
          })

          it('preserves existing mark metadata')
        })
      })

      describe('parallel merge', () => {

        // this scenario is what our current working model assumes; layers are
        // kept up-to-date with root separately, and then merged together

        beforeEach(() => {
          let merged12 = Layer.mergeWithEdits(doc1, doc2)
          let merged13 = Layer.mergeWithEdits(doc1, doc3)
          // merged (1 + 2) + 3
          merged123 = Layer.mergeWithEdits(merged12, merged13)

          // TODO test (1 + 3) + 2 for convergence with (1 + 2) + 3.
          let merged132 = Layer.mergeWithEdits(merged13, doc2)
        })

        it('has the correct number of marks', () => {
          assert.equal(merged123.marks.length, 15)
        })

        it('has the correct text', () => {
            let text = merged123.text
          assert.equal(text, 'NEW LAYER Hey Everybody - World course NEW LAYER')
        })

        describe('previously created marks', () => {
          let marks;

          beforeEach(() => {
            marks = merged123.marks.filter(m => JSON.parse(m.value).author === 'editor')
          })

          it('has the correct number of marks', () => {
            assert.equal(marks.length, 3)
          })

          it('correctly modifies existing marks', () => {
            let mks = marks.map(({type, start, end}) => ({ type, start, end }))

            assert.deepEqual([
              { type: 'delete', start: 0, end: 0 },
              { type: 'insert', start: 10, end: 13 },
              { type: 'insert', start: 14, end: 32 }
            ], mks)
          })

          it('modified marks cover the correct text', () => {
            marks.forEach(mark => {
              // deletions are zero-length; tested in the 'correctly modifies existing marks' test above
              if (mark.type === 'delete') return

              // this is a special case where an insertion mark is now
              // zero-length because the inserted text has been deleted.
              if (mark.start === mark.end) return
              assert.equal(JSON.parse(mark.value).text, merged123.text.substring(mark.start, mark.end))
            })
          })

          it('preserves existing mark metadata')
        })

        describe('new marks', () => {
          let marks;

          beforeEach(() => {
            marks = merged123.marks.filter(m => JSON.parse(m.value).author === 'editor 2')
          })

          it('has the correct number of new marks', () => {
            assert.equal(marks.length, 17)
          })

          it('correctly adds new marks')
          it('retains metadata for new marks')
        })
      })
    })
  })
})
