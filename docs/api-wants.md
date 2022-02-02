

### Checking out older commits in a version 


Version
 -> Array<Change>
    -> Change (message, ops)


```js
doc.title = 'le papier' // change (message = null)
let prev = doc.commit('translated to french') // change (message = 'translated to french')

doc.insertAt(3, 'l') // starts a new transaction


doc.insertAt(0, 'H')// change (message = null)
doc.insertAt(1, 'e')// change (message = null)
doc.title = 'le papier!' // change (message = null)
let next = doc.commit('got feedback from a native french speaker')  // change (message = 'got feedback ...')
//transaction closed



doc.history.push(heads)

let oldTitle = doc.value('title', prev)
// oldTitle === le papier

// What we want from automerge that doesn't exist
doc.getAllChanges().filter(doc => doc.message !== null) 
-> 2 changes


```
