import * as Automerge from 'automerge-wasm-pack';
import { nanoid } from "nanoid";
import { AuthorId, Author } from '.';
import { Comments, createAuthorId, CommentState } from ".";

const ROOT = '_root'

export class Draft {
  id: string;
  doc: Automerge.Automerge;
  comments: Comments;
  currentAuthor: Author
  _heads: Automerge.Heads;

  constructor(id: string, doc: Automerge.Automerge, author: Author) {
    this.id = id
    this.doc = doc
    this.currentAuthor = author
    this.comments = new Comments(doc, "comments");
    this._heads = []
  }

  static load(id: string, binary: Uint8Array, author: Author) {
    let doc = Automerge.loadDoc(binary)
    return new Draft(id, doc, author)
  }

  addContributor(author: Author) {
    this.doc.set_object("/contributors", author.id, author);
  }

  fork(author: Author) {
    let id = nanoid()
    let doc = this.doc.fork()
    return new Draft(id, doc, author)
  }

  checkout(heads: Automerge.Heads) {
    this._heads = heads
  }

  get contributors(): Author[] {
    let contribMap = this.doc.materialize("/contributors");
    return Object.values(contribMap);
  }

  set title(value: string) {
    this.doc.set(ROOT, "title", value);
  }

  get title(): string {
    return this.doc.materialize("/title") as string;
  }

  merge(draft: Draft) {
    return this.merge(draft)
  }

  get text() {
    return this.doc.materialize('text')
  }

  static create(author: Author) {
    let id = nanoid()
    let doc = Automerge.create()
    // for prosemirror, we can't have an empty document, so fill some space
    doc.set_object(ROOT, "title", "");
    let text = doc.set_object(ROOT, "text", " ");
    let initialParagraph = doc.insert_object(text, 0, { type: "paragraph" });
    doc.set(initialParagraph, "type", "paragraph");
    return new Draft(id, doc, author)
  }

  static mergeWithEdits(author: Author, ours: Draft, ...theirs: Draft[]) {
    // Fork the comparison draft, because we want to create a copy, not modify
    // the original. It might make sense to remove this from here and force the
    // caller to do the fork if this is the behaviour they want in order to
    // parallel Draft.merge() behaviour.
    let newDraft = ours.fork(author);
    let origHead = newDraft.doc.getHeads();

    // Merge all the passed-in drafts to this one.
    theirs.forEach((draft) => newDraft.merge(draft));

    // Now do a blame against the heads of the comparison drafts.
    let heads = theirs.map((draft) => draft.doc.getHeads());

    let obj = newDraft.doc.value(ROOT, "text");
    if (!obj || obj[0] !== "text")
      throw new Error("Text field not properly initialized");

    let attribution = newDraft.doc.attribute2(obj[1], origHead, heads)
    console.log('attribution', attribution)

    // blame contains an array with an entry for each draft passed in above,
    // with edits (add, del) applied against newDraft's text. Convert those to marks!

    for (let i = 0; i < attribution.length; i++) {
      let draft = theirs[i]
      let edits = attribution[i]

      edits.add.forEach(edit => {
        let text = newDraft.text.substring(edit.start, edit.end)
        newDraft.mark(
          'insert',
          `(${edit.start}..${edit.end})`,
          JSON.stringify({
            author: draft.currentAuthor.id,
            text
          })
        )
      })

      edits.del.forEach(edit => {
        newDraft.mark(
          'delete',
          `(${edit.pos}..${edit.pos})`,
          JSON.stringify({
            author: draft.currentAuthor.id,
            text: edit.val
          })
        )
      })
    }

    return newDraft
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

  deleteAt(position: number, count: number = 1, prop = "text") {
    let obj = this.doc.value(ROOT, prop);
    if (obj && obj[0] === "text")
      return this.doc.splice(obj[1], position, count, "");
    else throw new Error("Text field not properly initialized");
  }

  mark(name: string, range: string, value: Automerge.Value, prop = "text") {
    let obj = this.doc.value(ROOT, prop);
    if (obj && obj[0] === "text")
      return this.doc.mark(obj[1], range, name, value);
    else throw new Error("Text field not properly initialized");
  }

  getMarks(prop = "text") {
    let obj = this.doc.value(ROOT, "text");
    if (obj && obj[0] === "text") return this.doc.raw_spans(obj[1]);
    else throw new Error("Text field not properly initialized");
  }

  get marks() {
    return this.getMarks();
  }

  static getActorId(authorId: AuthorId) {
    return authorId + "0000" + createAuthorId();
  }

  insertComment(
    from: number,
    to: number,
    message: string,
    author: Author
  ): string {
    let comment_id = nanoid();
    let comment = {
      id: comment_id,
      author: author,
      message,
      children: [],
      state: CommentState.OPEN,
    };

    this.comments.insert(comment);

    this.mark("comment", `[${from}..${to}]`, comment_id);
    return comment_id;
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

}