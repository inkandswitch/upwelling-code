# Data Model

![upwell](upwell-v0.drawio.png)

## Upwell 

An upwell is a file format that contains multiple versions of unmerged UpwellDocs. Each upwell has an id that can be used to identify it uniquely in a URL or other database. 

An upwell is a tar file that contains multiple files. One is special, called 'metadata'. Each file will have:

| filename | type | description
| --- | --- | --- | 
| {version_id}.automerge | UpwellDoc | Multiple documents, with the version id in the filename
| root.txt | string | deadbeef
| upwell.automerge | nanoid | A text file with the upwell id in it
| authors.automerge | Author | A file with the author


### Files
#### upwell.automerge

The Upwell is an Automerge document that contains an index of the information you need to know about all of the information in this Upwell. It has the following properties:

| prop | type | description 
| --- | --- | --- 
| id | string | The id of this upwell
| title | string | The title of this upwell
| authors | Map<author_id, Map> | A map of author_id to author metadta (e.g., { name: string, email: string }). 

#### {version_id}.automerge

A document is an encapsulated class around an Automerge document. Each UpwellDoc also is assigned a version id which is unique to the document.

UpwellDoc has the following properties:

| prop | type | description
| --- | --- | --- | 
| text | Automerge.TEXT | A growable array CRDT that implements the Peritext algorithm.
| title | Automerge.TEXT | A human-readable title of the document.
| meta | UpwellDocMetadata | A representation of the UpwellDocMetadata

UpwellDocMetadata has the following properties:

| prop | type | description
| --- | --- | --- | 
| upwell_id | string | A unique identifier for the upwell (may be unnecessary).
| version_id | string| A unqiue identifer for this version.
| author_id | string | The id of the author who created this version. 
| message | string | A human-readable message to describe the version.

#### Notes

This architecture prevents us from leaking any Automerge calls to the React frontend, which enables frontend and backend teams to iterate in parallel. It also helps us create a test suite and improve the reliability of the system which is crucial for making sure demos go hopefully slightly better than average :)
