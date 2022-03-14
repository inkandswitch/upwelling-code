import { Collection } from '../src/db'
import { create } from 'automerge-wasm-pack'
import { it } from 'mocha';
import { assert } from 'chai';


type Toy = {
    id: string,
    type: 'ball' | 'spring' | 'doll',
    color: string,
    destroyed: boolean,
    owner: string,
    price: number
}

describe.only('db', () => {
  let doc = create()
  let toys = new Collection<Toy>(doc, 'toys') 
  it('inserts and gets data', async () => {
      let ball: Toy = {
          id: 'abc123',
          type: 'ball', 
          color: 'blue', 
          owner: 'john',
          destroyed: false,
          price: 300
      }
      toys.insert(ball)

      assert.deepEqual(toys.get('abc123'), ball)
  })

  it('queries', async () => {
      let spring: Toy = {
          id: 'def456',
          type: 'spring', 
          color: 'yellow', 
          owner: 'dizzy',
          destroyed: false,
          price: 30
      }
      toys.insert(spring)

      assert.deepEqual(toys.get('def456'), spring)
      let match = toys.query({destroyed: false})
      assert.equal(match.length, 2)

      let spring2: Toy = {
        id: '789',
        type: 'spring', 
        color: 'orange', 
        owner: 'tito',
        destroyed: true ,
        price: 3
    }
    toys.insert(spring2)

    match = toys.query({destroyed: false})
    assert.equal(match.length, 2)
    
    match = toys.query({destroyed: true})
    assert.equal(match.length, 1)
  })

  it('updates', async () => {
    let match = toys.query({destroyed: false}, {limit: 10})
    assert.equal(match.length, 2)
    toys.update(match[1], {destroyed: true})

    match = toys.query({destroyed: false})
    assert.equal(match.length, 1)

    match = toys.query({destroyed: true})
    assert.equal(match.length, 2)
  })

  it('observe', async () => {
    let query = toys.observe({destroyed: false})

    // navigate to page
    query.on('change', () => {
        render()
    })

    // page navigate away
    query.stop()
  })
})