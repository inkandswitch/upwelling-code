# Data Model

![upwell](upwell-v0.drawio.png)

## Upwell

An `.upwell` is a file format. An upwell is a tar file that contains multiple files.

| filename             | type        | description                                           |
| -------------------- | ----------- | ----------------------------------------------------- |
| {draft_id}.automerge | UpwellDraft | Multiple documents, with the draft id in the filename |
| metadata.automerge   | Metadata    | An automerge document with the upwell metadata in it  |

### Files

#### metadata.automerge

The `metadata.automerge` file is an Automerge document that contains the metadata about this upwell. It is an Automerge document because we want to be able to update the id or authors in a way that respects the fact that multiple people could edit these properties concurrently over time. It is also separate from any particular draft or version of the document, as it contains information that is important for downstream applications to be able to properly render UI elements. It has the following properties:

| prop     | type                 | description                                                                                                     |
| -------- | -------------------- | --------------------------------------------------------------------------------------------------------------- |
| main_id  | string               | The root id of the draft, which should point to a draft on disk. If that draft doesn't exist, things are bad!!! |
| id       | string               | The id of this upwell                                                                                           |
| archived | Map<string, boolean> | A map of draft ids to boolean indicating if they are archived                                                   |

#### {draft_id}.automerge

A Draft is an encapsulated class around an Automerge document. Each Draft also is assigned a draft id which is unique to the document. Every draft **SHOULD** have a common ancestor with the `main_id` document, defined in `metadata.automerge`. It is hard to enforce this but generally as long as all drafts are created using `upwell.create` method, this will be true.

A draft has the following properties:

| prop  | type           | description                                                   |
| ----- | -------------- | ------------------------------------------------------------- |
| text  | Automerge.TEXT | A growable array CRDT that implements the Peritext algorithm. |
| title | Automerge.TEXT | A human-readable title of the document.                       |
| meta  | Map            | An instance of DraftMetadata                                  |

DraftMetadata is a Map that has the following properties:

| prop      | type    | description                                      |
| --------- | ------- | ------------------------------------------------ |
| parent_id | string  | The id of the draft this draft was derived from. |
| author    | string  | The handle of the author who created this draft. |
| message   | string  | A human-readable message to describe the draft.  |
| shared    | boolean | If the document is shared                        |

#### Notes

This architecture prevents us from leaking any Automerge calls to the React frontend, which enables frontend and backend teams to iterate in parallel. It also helps us create a test suite and improve the reliability of the system which is crucial for making sure demos go hopefully slightly better than average.
