import crypto from "crypto";
import * as Automerge from "automerge-wasm-pack"
import Debug from "debug";
import History from "./History";
import { Draft } from "."
import { DraftMetadata } from './DraftMetadata';

export type AuthorId = string;
export const UNKNOWN_AUTHOR = { id: createAuthorId(), name: "Anonymous" };
export const SPECIAL_ROOT_DOCUMENT = "UPWELL_ROOT@@@";
const ROOT = '_root'

export type Author = {
  id: AuthorId;
  name: string;
};

export type UpwellOptions = {
  id?: string;
  author: Author;
};

export type DraftMap = Map<string, DraftMetadata>

export type DraftId = string;

const debug = Debug("upwell");

export function createAuthorId() {
  return crypto.randomBytes(16).toString("hex");
}

// An Upwell is multiple drafts
export class Upwell {
  _draftLayers: Map<string, Draft> = new Map();
  _archivedLayers: Map<string, Uint8Array> = new Map();
  author: Author;
  doc: Automerge.Automerge;

  constructor(doc: Automerge.Automerge, author: Author) {
    this.doc = doc
    this.author = author;
    this.addAuthor(author);
  }

  static load(binary: Uint8Array, author: Author) {
    let doc = Automerge.loadDoc(binary)
    return new Upwell(doc, author)
  }

  isArchived(id: string): boolean {
    let draft = this.doc.materialize('/drafts/' + id)
    return draft.archived
  }

  archive(id: string): void {
    let metadata = this.doc.materialize('/drafts/' + id)
    if (metadata.archived) return debug('Already archived', id)
    metadata.archived = true
    this.doc.set_object('/drafts', id, metadata)
  }

  updateDraft(draft: DraftMetadata) {
    if (this.isArchived(draft.id)) throw new Error('Cannot update an archived draft with draftid=' + draft.id)
    this.doc.set_object('/drafts', draft.id, draft)
  }

  getDraft(id: string): DraftMetadata {
    return this.doc.materialize('/drafts/' + id)
  }

  addAuthor(author: Author) {
    let maybe = this.doc.value('/authors', author.id)
    if (!maybe) {
      console.log('adding author')
      this.doc.set_object('/authors', author.id, author)
    }
  }

  getAuthors() {
    return this.doc.materialize('/authors')
  }

  getAuthor(authorId: AuthorId): Author | undefined {
    return this.doc.materialize('/authors/' + authorId)
  }

  get rootDraft(): DraftMetadata {
    let len = this.doc.length('/history')
    let value = this.doc.value('/history', len - 1)
    if (value && value[0] == 'str') {
      let id = value[1]
      return this.getDraft(id)
    }
    throw new Error('History value not a string')
  }

  set rootDraft(draft: DraftMetadata) {
    this.updateDraft(draft)
    this.archive(draft.id)
    let len = this.doc.length('/history')
    this.doc.insert('/history', len, draft.id)
  }

  get id(): string {
    let value = this.doc.value(ROOT, 'id')
    if (value) return value[1] as string
    else return ''
  }


  get history(): History {
    return new History(this);
  }

  drafts(): DraftMetadata[] {
    let drafts: DraftMap = this.doc.materialize('/drafts')
    let res: DraftMetadata[] = []
    for (let draft of Object.values(drafts)) {
      if (!draft.archived) res.push(draft)
    }
    return res
  }

  addDraft(draft: Draft): DraftMetadata {
    let newDraft = new DraftMetadata(draft.id, this)
    let initialValues = {
      message: 'Added draft to Upwell',
      author: draft.currentAuthor,
      shared: false,
      time: Date.now(),
      archived: false
    }
    this.doc.set_object('/drafts', draft.id, initialValues)
    return newDraft;
  }

  share(id: string): void {
    let draft = this.getDraft(id);
    draft.shared = true;
    this.updateDraft(draft);
  }

  static create(id: string, rootDraft: Draft): Upwell {
    let doc = Automerge.create()
    console.log('id', id)
    doc.set(ROOT, 'id', id)
    doc.set_object(ROOT, 'drafts', {})
    doc.set_object(ROOT, 'history', [])
    doc.set_object(ROOT, 'authors', {})
    let upwell = new Upwell(doc, rootDraft.currentAuthor);
    let meta = upwell.addDraft(rootDraft)
    upwell.rootDraft = meta
    return upwell;
  }

  merge(other: Upwell) {
    let theirs = other.doc;
    let ours = this.doc;
    let heads = theirs.getHeads()
    let newHeads = ours.getHeads()
    if (!arrayEquals(heads, newHeads)) {
      ours.merge(theirs);
      return true
    }
    return false
  }
}

function arrayEquals(a: Array<any>, b: Array<any>) {
  return Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((val, index) => val === b[index]);
}