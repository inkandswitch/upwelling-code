
## Layer API

```js
let upwell = new Upwell('Upwell: Collaboration Engine')

// get layer, always a default one created initially
let layer = upwell.layers()[0]
layer.insertAt(0, 'hello world!')

// create a new layer based on another layer
let author = "tito"
let message = 'experimenting with new introduction'
let layer2 = upwell.create({ author, layer, message })

// get all layers
let layers = upwell.layers()
// layers = [UpwellDoc(message='Titos Layer'), UpwellDoc(message='Initialized document')]


// merge two layers (preview), it will return the merged document but won't destructively 
// delete other layers
let mergedLayer = upwell.merge(layers[0], layers[1])

// to do a destructive merge of two layers (add merged layer and remove the other two):
let author = 'dizzy'
let message = 'New introduction'
upwell.add(mergedLayer, {author, message})
upwell.hide(layers[0])
upwell.hide(layers[1])
// hidden layers do not show up in upwell.layers()

let layers = upwell.layers()
// layers = [UpwellDoc(message='New introduction')]

// to get all layers, even hidden ones
let layers = upwell.layers({hidden: true})


// to evict a layer from the file and get space back




```

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
