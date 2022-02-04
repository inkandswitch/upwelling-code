
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
upwell.archive(layers[0])
upwell.archived(layers[1])
// archived layers do not show up in upwell.layers()

let layers = upwell.layers()
// layers = [UpwellDoc(message='New introduction')]

// to get all layers, even hidden ones
let layers = upwell.layers({archived: true})
// layers.length === 3
```


### Deleting layers for space (not necessary now)
```js
let layers = upwell.layers({hidden: true})
// to remove a layer from the file and get space back (DESTRUCTIVE ACTION!!!)
upwell.evict(layers[2])
// after eviction, that layer is gone forever
let layers = upwell.layers({hidden: true})
// layers.length === 2

```

## Root layer

`upwell.archive`  and `upwell.evict` should throw an error if the layer to be removed is the root layer. If you want to change the root layer, use

```js
// change the root layer to a new layer
upwell.root = layer
```


### Viewing older versions of a layer

Layer contains an Array<Change> and a change has (message, ops)

```js
layer.title = 'le papier' // change (message = null)
let prev = layer.commit('translated to french') // change (message = 'translated to french')

layer.insertAt(3, 'l') // starts a new transaction

layer.insertAt(0, 'H')// change (message = null)
layer.insertAt(1, 'e')// change (message = null)
layer.title = 'le papier!' // change (message = null)
let next = layer.commit('got feedback from a native french speaker')  // change (message = 'got feedback ...')
//transaction closed



// view an older version of the document, which returns a new document that is that version
// at that period of time. The layer is unmodified
let oldVersionOfThatLayer = layer.checkout(prev)
// oldVersion.title === le papier

```
