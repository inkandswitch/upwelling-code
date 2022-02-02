# Data Model

![upwell](upwell-v0.drawio.png)

## Upwell 

An upwell is a file format that contains multiple versions of unmerged Layers. Each upwell has an id that can be used to identify it uniquely in a URL or other database. 

An upwell is a tar file that contains multiple files. One is special, called 'metadata'. Each file will have:

| filename | type | description
| --- | --- | --- | 
| {version_id}.automerge | UpwellDoc | Multiple documents, with the version id in the filename
| root.txt | string | The string id of the upwell
| upwell.automerge | nanoid | An automerge document with the upwell metadata in it

### Files
#### upwell.automerge

The Upwell is an Automerge document that contains an index of the information you need to know about all of the information in this Upwell. It has the following properties:

| prop | type | description 
| --- | --- | --- 
| id | string | The id of this upwell, which should point to a layer on disk. If that layer doesn't exist, things are bad 
| authors | Map<author_id, Map> | A map of author_id to author metadata (e.g., { name: string, email: string }). 

#### {layer_id}.automerge

A Layer is an encapsulated class around an Automerge document. Each Layer also is assigned a layer id which is unique to the document.

A layer has the following properties:

| prop | type | description
| --- | --- | --- | 
| text | Automerge.TEXT | A growable array CRDT that implements the Peritext algorithm.
| title | Automerge.TEXT | A human-readable title of the document.
| meta | Map | An instance of LayerMetadata

LayerMetadata is a Map that has the following properties:

| prop | type | description
| --- | --- | --- | 
| upwell_id | string | A unique identifier for the upwell (may be unnecessary).
| layer_id | string | A unqiue identifer for this layer.
| author_id | string | The id of the author who created this layer. 
| message | string | A human-readable message to describe the layer.

#### Notes

This architecture prevents us from leaking any Automerge calls to the React frontend, which enables frontend and backend teams to iterate in parallel. It also helps us create a test suite and improve the reliability of the system which is crucial for making sure demos go hopefully slightly better than average.
