import { nanoid } from "nanoid";
import init, {
  Automerge,
  loadDoc,
  create,
  Value,
  SyncMessage,
  SyncState,
  decodeChange,
  ChangeSet,
} from "automerge-wasm-pack";
import { Author, AuthorId, isAuthor } from "./Upwell";
import { Comments, createAuthorId, CommentState } from ".";

export async function loadForTheFirstTimeLoL() {
  return new Promise<void>((resolve, reject) => {
    init().then(() => {
      resolve();
    });
  });
}

const ROOT = "_root";

export type ChangeMetadata = {
  message: string;
  authorId: AuthorId;
};

export type Heads = string[];
export type DraftMetadata = {
  id: string;
  heads: string[]
  contributors: string[];
  title: string;
  text: string;
  time: number;
  marks: any;
  comments: any;
  shared: boolean;
  parent_id: string;
  authorId: AuthorId;
  message: string;
};

export type Subscriber = (doc: Draft) => void;

export class LazyDraft {
  binary: Buffer;
  id: string;
  constructor(id: string, binary: Buffer) {
    this.binary = binary;
    this.id = id;
  }

  hydrate() {
    return new Draft(this.id, loadDoc(this.binary));
  }
}

export class Draft {
  id: string;
  doc: Automerge;
  comments: Comments;
  _heads?: Heads = []
  subscriber: Subscriber = () => { };

  constructor(id: string, doc: Automerge, heads?: Heads) {
    this.id = id;
    this.doc = doc;
    this.comments = new Comments(doc, "comments");
    this._heads = heads
  }

  private _getAutomergeText(prop: string): string {
    let value = this.doc.value(ROOT, prop, this._heads);
    if (value && value[0] === "text") return this.doc.text(value[1], this._heads);
    else return "";
  }

  private _getValue(prop: string) {
    let value = this.doc.value(ROOT, prop, this._heads);
    if (value && value[0]) return value[1];
  }

  get shared() {
    return this._getValue("shared") as boolean;
  }

  get contributors(): string[] {
    let contribMap = this.doc.materialize("/contributors");
    return Object.keys(contribMap);
  }

  set shared(value: boolean) {
    this.doc.set(ROOT, "shared", value);
  }

  get time(): number {
    return this._getValue("time") as number;
  }

  set time(value: number) {
    this.doc.set(ROOT, "time", value);
  }

  get message(): string {
    return this._getValue("message") as string;
  }

  set message(value: string) {
    this.doc.set(ROOT, "message", value);
  }

  get text(): string {
    return this._getAutomergeText("text");
  }

  get authorId(): AuthorId {
    return this._getValue("author") as AuthorId;
  }

  set title(value: string) {
    this.doc.set(ROOT, "title", value);
  }

  get title(): string {
    return this._getValue("title") as string;
  }

  get parent_id(): string {
    return this._getValue("parent_id") as string;
  }

  set parent_id(value: string) {
    this.doc.set(ROOT, "parent_id", value);
  }

  subscribe(subscriber: Subscriber) {
    this.subscriber = subscriber;
  }

  checkout(heads: Heads) {
    return new Draft(this.id, this.doc.clone(), heads)
  }

  materialize(heads?: Heads): DraftMetadata {
    if (heads) {
      let draft = this.checkout(heads)
      return draft.materialize()
    }
    return {
      id: this.id,
      title: this.title,
      heads: heads || this.doc.getHeads(),
      parent_id: this.parent_id,
      text: this.text,
      contributors: this.contributors,
      message: this.message,
      time: this.time,
      shared: this.shared,
      marks: this.marks,
      comments: this.comments.objects(),
      authorId: this.authorId,
    };
  }

  insertAt(position: number, value: string | Array<string>, prop = "text") {
    let obj = this.doc.value(ROOT, prop);
    if (obj && obj[0] === "text")
      return this.doc.splice(obj[1], position, 0, value);
    else throw new Error("Text field not properly initialized");
  }

  insertBlock(position: number, type: string) {
    let text = this.doc.value(ROOT, "text");
    if (text && text[0] === "text")
      this.doc.insert_object(text[1], position, { type });
    else throw new Error("text not properly initialized");
  }

  insertComment(
    from: number,
    to: number,
    message: string,
    authorId: string
  ): string {
    let comment_id = nanoid();
    let comment = {
      id: comment_id,
      author: authorId,
      message,
      children: [],
      state: CommentState.OPEN,
    };

    this.comments.insert(comment);

    this.mark("comment", `[${from}..${to}]`, comment_id);

    return comment_id;
  }

  deleteAt(position: number, count: number = 1, prop = "text") {
    let obj = this.doc.value(ROOT, prop);
    if (obj && obj[0] === "text")
      return this.doc.splice(obj[1], position, count, "");
    else throw new Error("Text field not properly initialized");
  }

  mark(name: string, range: string, value: Value, prop = "text") {
    let obj = this.doc.value(ROOT, prop);
    if (obj && obj[0] === "text")
      return this.doc.mark(obj[1], range, name, value);
    else throw new Error("Text field not properly initialized");
  }

  getMarks(prop = "text") {
    let obj = this.doc.value(ROOT, "text");
    if (!obj || obj[0] !== "text") throw new Error("Text field not properly initialized");

    let rawSpans = this.doc.raw_spans(obj[1])
    let spanCollector = {
      strong: new Array(this.text.length).fill(false, 0, this.text.length),
      italic: new Array(this.text.length).fill(false, 0, this.text.length) 
    }
    let spanActors = {
      strong: new Array(this.text.length),
      italic: new Array(this.text.length)
    }

    let filteredSpans: any[] = []
    for (let span of rawSpans) {
      if (!spanCollector[span.type]) {
        filteredSpans.push(span)
        continue
      }
      spanCollector[span.type].fill(span.value, span.start, span.end)
      spanActors[span.type].fill(span.id, span.start, span.end)
    }

    for (let type of Object.keys(spanCollector)) {
      let spanOffsets = spanCollector[type]
      let idx = 0
      while (true) {
        let start = spanOffsets.indexOf(true, idx)
        if (start === -1) break
        let end = spanOffsets.indexOf(false, start + 1)
        if (end === -1) break
        filteredSpans.push({
          start, end, type, value: true, id: spanActors[type][start]
        })
        idx = end + 1
      }
    }

    return filteredSpans
  }

  get marks() {
    return this.getMarks();
  }

  // TODO refactor this to use materialize or whatever because there is some
  // nasty hoop-jumping here.
  get blocks() {
    let blocks: any[] = [];
    let text = this.doc.value(ROOT, "text");
    if (!text || text[0] !== "text")
      throw new Error("text not properly initialized");

    let i = this.text.indexOf("\uFFFC");
    while (i !== this.text.length) {
      // don't include the block replacement character, since it's just a marker
      // that the paragraph follows
      let start = i + 1;

      // find the next block replacement character; this will be the end of our
      // block (if there isn't a next block, this block ends at the end of the
      // text
      let end = this.text.indexOf("\uFFFC", i + 1);
      if (end === -1) end = this.text.length;

      // get the attributes for this block
      let attrsObj = this.doc.value(text[1], i);
      let attrs: any = {};
      if (attrsObj && attrsObj[0] === "map")
        attrs = this.doc.materialize(attrsObj[1]);
      else
        throw new Error(
          "block properties not initialized, something has gone very wrong"
        );
      let block = { start, end, ...attrs };
      blocks.push(block);
      i = end;
    }

    return blocks;
  }

  save(): Uint8Array {
    return this.doc.save();
  }

  fork(message: string, author: Author | AuthorId): Draft {
    let id = nanoid();
    let doc = this.doc.fork();
    doc.set(ROOT, "message", message);
    let authorId = isAuthor(author) ? author.id : author.toString()
    doc.set(ROOT, "author", authorId);
    doc.set(ROOT, "shared", false);
    doc.set(ROOT, "time", Date.now());
    doc.set(ROOT, "archived", false);
    doc.set(ROOT, "parent_id", this.id);
    let draft = new Draft(id, doc);
    draft.addContributor(authorId)
    return draft;
  }

  addContributor(authorId: AuthorId) {
    this.doc.set("/contributors", authorId, true);
  }

  merge(theirs: Draft): string[] {
    let opIds = this.doc.merge(theirs.doc);
    if (this.subscriber) this.subscriber(this);
    return opIds
  }

  static mergeWithEdits(
    author: Author | AuthorId,
    ours: Draft,
    ...theirs: Draft[]
  ): { draft: Draft; attribution: ChangeSet[] } {
    // Fork the comparison draft, because we want to create a copy, not modify
    // the original. It might make sense to remove this from here and force the
    // caller to do the fork if this is the behaviour they want in order to
    // parallel Draft.merge() behaviour.
    let newDraft = ours.fork('Attribution merge', author)
    let origHead = newDraft.doc.getHeads()

    // Merge all the passed-in drafts to this one.
    theirs.forEach(draft => newDraft.merge(draft))

    // Now do a blame against the heads of the comparison drafts.
    let heads = theirs.map(draft => draft.doc.getHeads())

    let obj = newDraft.doc.value(ROOT, 'text')
    if (!obj || obj[0] !== 'text') throw new Error('Text field not properly initialized')

    let attribution = newDraft.doc.attribute2(obj[1], origHead, heads)

    return {draft: newDraft, attribution}
  }

  static getActorId(authorId: AuthorId) {
    return authorId + "0000" + createAuthorId();
  }

  static load(id: string, binary: Uint8Array, authorId: AuthorId): Draft {
    let doc = loadDoc(binary, this.getActorId(authorId));
    let draft = new Draft(id, doc);
    return draft;
  }

  static create(message: string, authorId: AuthorId): Draft {
    let doc = create(this.getActorId(authorId));
    let id = nanoid();
    doc.set(ROOT, "message", message);
    doc.set(ROOT, "author", authorId);
    doc.set(ROOT, "shared", false, "boolean");
    doc.set(ROOT, "pinned", false);
    doc.set(ROOT, "parent_id", id)
    doc.set(ROOT, "time", Date.now(), "timestamp");
    doc.set(ROOT, "archived", false, "boolean");
    doc.set(ROOT, "title", "");
    doc.set_object(ROOT, "comments", {});
    doc.set_object(ROOT, "contributors", {});
    // for prosemirror, we can't have an empty document, so fill some space
    let text = doc.set_object(ROOT, "text", " ");
    let initialParagraph = doc.insert_object(text, 0, { type: "paragraph" });
    doc.set(initialParagraph, "type", "paragraph");
    let draft = new Draft(id, doc);
    draft.addContributor(authorId);
    return draft;
  }

  commit(message: string): Heads {
    let meta: ChangeMetadata = { authorId: this.authorId, message };
    let heads = this.doc.commit(JSON.stringify(meta));
    if (this.subscriber) this.subscriber(this);
    return heads;
  }
}
