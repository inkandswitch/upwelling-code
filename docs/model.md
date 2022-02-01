# Data Model

## Upwell 

An upwell is a file format that contains multiple versions of unmerged UpwellDocs. Each upwell has an id that can be used to identify it uniquely in a URL or other database. 

An upwell is a tar file that contains multiple files. One is special, called 'metadata'. Each file will have:

| filename | type | description
| --- | type |--- | 
| metadata.automerge | UpwellIndex | An automerge document of indexable metadata 
|{version_id}.automerge | UpwellDoc | Multiple documents, with the version id in the filename

## UpwellIndex

The UpwellIndex is an automerge document that contains an index of the information you need to know before opening any particular version. It adds context to the collection of documents that otherwise couldn't be captured in a single document. 

UpwellIndex has the following properties:

| prop | type | description
| --- | --- | --- | 
| upwell_id | nanoid  | A unique identifier for the upwell
| authors | Map<author_id, string> | A map of author_id to author name. 
| documents | Array<version_id> | A list of version_ids that are part of this Upwell

## UpwellDoc

A document is an encapsulated class around an Automerge document. Each UpwellDoc also is assigned a version id which is unique to the document.

UpwellDoc has the following properties:

| prop | type | description
| --- | --- | --- | 
| text | string | A growable array CRDT that implements the Peritext algorithm.
| title | string | A human-readable title of the document.
| meta | Map<string, string> | A representation of the UpwellDocMetadata

## UpwellDocMetadata

UpwellDocMetadata has the following properties:

| prop | type | description
| --- | --- | --- | 
| upwell_id | string | A unique identifier for the upwell (may be unnecessary).
| version_id | string| A unqiue identifer for this version.
| author_id | string | The id of the author who created this version. 
| message | string | A human-readable message to describe the version.

#### Notes

The author is currently a string. In general, an author could be more complicated. For now, punting on making decisions on this until we have more insight into how an "author" will behave in the system.

This architecture prevents us from leaking any Automerge calls to the React frontend, which enables frontend and backend teams to iterate in parallel. It also helps us create a test suite and improve the reliability of the system which is crucial for making sure demos go hopefully slightly better than average :)

