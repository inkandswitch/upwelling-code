import { createAuthorId, Upwell, Draft } from '../src/index'
import { it } from 'mocha'
import { assert } from 'chai'

describe('edits', () => {
  let doc1: Draft, doc2: Draft, doc3: Draft
  let author = { id: createAuthorId(), name: 'author' }
  let author_doc2 = { id: createAuthorId(), name: 'doc2' }
  let author_doc3 = { id: createAuthorId(), name: 'doc3' }

  beforeEach(async () => {
    let d = Upwell.create({ author })
    doc1 = d.drafts()[0]
    doc1.insertAt(0, 'Hello of course')
    doc1.commit('Hello!')

    doc2 = doc1.fork('Additional forked draft', author_doc2)
    d._add(doc2)

    doc2.insertAt(5, ' World')
    doc2.insertAt(0, 'Hey Everybody - ')
    doc2.deleteAt(16, 6)
    doc2.commit('I hope you like my changes!')

    doc3 = doc1.fork('Additional forked draft', author_doc3)
    d._add(doc3)

    doc3.insertAt(15, ' NEW LAYER')
    doc3.insertAt(0, 'NEW LAYER ')
    doc3.deleteAt(16, 3)
  })

  it('has the correct base documents', () => {
    assert.equal(doc1.text, 'Hello of course\ufffc ')
    assert.equal(doc2.text, 'Hey Everybody - World of course\ufffc ')
    assert.equal(doc3.text, 'NEW LAYER Hello course NEW LAYER\ufffc ')
  })

  describe('mergeWithEdits', () => {
    let merged: Draft

    beforeEach(async () => {
      let upwell = Upwell.create({ author })
      let { draft } = upwell.mergeWithEdits(author, doc1, doc2)
      merged = draft
    })

    describe('with two drafts', () => {
      it('has the correct text', () => {
        assert.equal('Hey Everybody - World of course\ufffc ', merged.text)
      })
      it('has the correct number of marks', () => {
        assert.equal(merged.marks.length, 2)
      })

      it('preserves changes as marks', () => {
        let marks = merged.marks.map(({ type, start, end }) => ({
          type,
          start,
          end,
        }))

        assert.deepEqual(
          [
            { type: 'insert', start: 0, end: 21 },
            { type: 'delete', start: 16, end: 16 },
          ],
          marks
        )
      })

      it('retains metadata', () => {
        let marksValues = merged.marks.map((mark) => {
          return mark.value
        })

        assert.deepEqual(
          [
            JSON.stringify({
              author: author_doc2.id,
              text: 'Hey Everybody - World',
            }),
            JSON.stringify({ author: author_doc2.id, text: 'Hello' }),
          ],
          marksValues
        )
      })
    })

    describe('with three drafts', () => {
      let merged123

      describe('linear merge', () => {
        // this is a contrived example because this approach would only allow
        // us to merge together drafts that have *not* been updated to the most
        // recent root. See parallel merge below for the more realistic scenario.

        beforeEach(() => {
          let upwell = Upwell.create({ author })
          merged123 = upwell.mergeWithEdits(author, doc1, doc2, doc3)
        })

        it('has the correct number of marks', () => {
          assert.equal(merged123.marks.length, 5)
        })

        it('has the correct text', () => {
          assert.equal(
            merged123.text,
            'NEW LAYER Hey Everybody - World course NEW LAYER\ufffc '
          )
        })

        describe('marks from doc2', () => {
          let marks

          beforeEach(() => {
            marks = merged123.marks.filter(
              (m) => JSON.parse(m.value).author === author_doc2.id
            )
          })

          it('has the correct number of marks', () => {
            assert.equal(marks.length, 2)
          })

          it('correctly places marks', () => {
            let mks = marks.map(({ type, start, end }) => ({
              type,
              start,
              end,
            }))

            assert.deepEqual(
              [
                { type: 'insert', start: 10, end: 31 },
                { type: 'delete', start: 26, end: 26 },
              ],
              mks
            )
          })

          it('cover the correct text', () => {
            marks.forEach((mark) => {
              // deletions are zero-length; tested in the 'correctly modifies existing marks' test above
              if (mark.type === 'delete') return

              // this is a special case where an insertion mark is now
              // zero-length because the inserted text has been deleted.
              if (mark.start === mark.end) return
              assert.equal(
                JSON.parse(mark.value).text,
                merged123.text.substring(mark.start, mark.end)
              )
            })
          })

          it('insertions are correct (manual check)', () => {
            let insertions = marks
              .filter((m) => m.type === 'insert')
              .map((m) => {
                return merged123.text.substring(m.start, m.end)
              })

            assert.deepEqual(['Hey Everybody - World'], insertions)
          })

          it('deletions are correct (manual check)', () => {
            let deletions = marks
              .filter((m) => m.type === 'delete')
              .map((m) => {
                return JSON.parse(m.value).text
              })

            assert.deepEqual(['Hello'], deletions)
          })
        })

        describe('marks from doc3', () => {
          let marks

          beforeEach(() => {
            marks = merged123.marks.filter(
              (m) => JSON.parse(m.value).author === author_doc3.id
            )
          })

          it('has the correct number of new marks', () => {
            assert.equal(marks.length, 3)
          })

          it('correctly places marks', () => {
            let mks = marks.map(({ type, start, end }) => ({
              type,
              start,
              end,
            }))

            assert.deepEqual(
              [
                { type: 'insert', start: 0, end: 10 },
                { type: 'insert', start: 38, end: 48 },
                { type: 'delete', start: 32, end: 32 },
              ],
              mks
            )
          })

          it('cover the correct text', () => {
            marks.forEach((mark) => {
              // deletions are zero-length; tested in the 'correctly modifies existing marks' test above
              if (mark.type === 'delete') return

              // this is a special case where an insertion mark is now
              // zero-length because the inserted text has been deleted.
              if (mark.start === mark.end) return
              assert.equal(
                JSON.parse(mark.value).text,
                merged123.text.substring(mark.start, mark.end)
              )
            })
          })

          it('insertions are correct (manual check)', () => {
            let insertions = marks
              .filter((m) => m.type === 'insert')
              .map((m) => {
                return merged123.text.substring(m.start, m.end)
              })

            assert.deepEqual(['NEW LAYER ', ' NEW LAYER'], insertions)
          })

          it('deletions are correct (manual check)', () => {
            let deletions = marks
              .filter((m) => m.type === 'delete')
              .map((m) => {
                return JSON.parse(m.value).text
              })

            assert.deepEqual(['of '], deletions)
          })
        })
      })
    })
  })
})
