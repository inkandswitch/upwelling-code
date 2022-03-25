import concat from "concat-stream";
import tar from "tar-stream";
import crypto from "crypto";
import { nanoid } from "nanoid";
import { Readable } from "stream";
import { getRandomDessert } from "random-desserts";
import Debug from "debug";
import History from "./History";
import { Draft } from "./Draft";
import { UpwellMetadata } from "./UpwellMetadata";

export type AuthorId = string;
export const UNKNOWN_AUTHOR = { id: createAuthorId(), name: "Anonymous" };
export const SPECIAL_ROOT_DOCUMENT = "UPWELL_ROOT@@@";

export type Author = {
  id: AuthorId;
  name: string;
};

export type UpwellOptions = {
  id?: string;
  author: Author;
};

type MaybeDraft = {
  id: DraftId;
  binary: Uint8Array;
};
export type DraftId = string;

const debug = Debug("upwell");
const LAYER_EXT = ".draft";
const METADATA_KEY = "metadata.automerge";

export function createAuthorId() {
  return crypto.randomBytes(16).toString("hex");
}

// An Upwell is multiple drafts
export class Upwell {
  _drafts: Map<string, Draft> = new Map();
  metadata: UpwellMetadata;
  author: Author;
  subscriber: Function = function noop() { };

  constructor(metadata: UpwellMetadata, author: Author) {
    this.metadata = metadata;
    this.author = author;
    this.metadata.addAuthor(author);
  }

  get id() {
    return this.metadata.id;
  }

  get rootDraft() {
    let rootId = this.metadata.main;
    return this.get(rootId);
  }

  get history(): History {
    return new History(this);
  }

  set rootDraft(draft: Draft) {
    this.metadata.main = draft.id;
    this.archive(draft.id)
    this.subscriber();
  }

  subscribe(subscriber: Function) {
    this.subscriber = subscriber;
  }

  unsubscribe() {
    this.subscriber = function noop() { };
  }

  drafts(): Draft[] {
    return Array.from(this._drafts.values()).filter(draft => !this.isArchived(draft.id))
  }

  getAuthorName(authorId: AuthorId): string | undefined {
    let author = this.metadata.getAuthor(authorId);
    if (author) return author.name;
    else return undefined;
  }

  add(draft: Draft) {
    this._drafts.set(draft.id, draft)
    this.metadata.addDraft(draft);
  }

  createDraft(message?: string) {
    if (!message) message = getRandomDessert() as string;
    let newDraft = this.rootDraft.fork(message, this.author);
    this.add(newDraft)
    return newDraft;
  }

  share(id: string): void {
    let draft = this.get(id);
    draft.shared = true;
    this.add(draft);
  }

  updateToRoot(draft: Draft) {
    let root = this.rootDraft;
    let message = draft.message;
    draft.merge(root);
    draft.message = message;
    draft.parent_id = root.id;
    this.add(draft)
  }

  isArchived(id: string): boolean {
    return this.metadata.isArchived(id);
  }

  archive(id: string): void {
    if (this.isArchived(id)) return
    let draft = this._drafts.get(id)
    if (!draft) throw new Error('Draft with doesnt exist with id=' + id)
    draft.archived = true
    this.metadata.archive(id);
    this.subscriber();
  }

  _coerceDraft(id, buf: Draft | Uint8Array): Draft {
    if (buf?.constructor.name === "Uint8Array")
      return Draft.load(id, buf as Uint8Array, this.author.id);
    else return buf as Draft;
  }

  get(id: string): Draft {
    let draft = this._drafts.get(id)
    if (!draft) throw new Error('No draft with id=' + id)
    return draft
  }

  async toFile(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      let pack = this.serialize();

      let toBinaryStream = concat((binary: Buffer) => {
        resolve(binary);
      });

      pack.pipe(toBinaryStream);
    });
  }

  static deserialize(stream: Readable, author: Author): Promise<Upwell> {
    return new Promise<Upwell>((resolve, reject) => {
      let unpackFileStream = (stream: any, next: Function) => {
        let concatStream = concat((buf: Buffer) => {
          next(buf);
        });
        stream.on("error", (err: Error) => {
          console.error(err);
        });
        stream.pipe(concatStream);
        stream.resume();
      };

      let metadata: any = null;
      let extract = tar.extract();
      let drafts: MaybeDraft[] = [];

      function onentry(header, stream, next) {
        if (header.name === METADATA_KEY) {
          unpackFileStream(stream, (buf: Buffer) => {
            metadata = buf;
            next();
          });
        } else {
          unpackFileStream(stream, (binary: Buffer) => {
            let filename = header.name;
            let id = filename.split(".")[0];
            drafts.push({
              id,
              binary: Uint8Array.from(binary),
            });
            next();
          });
        }
      }

      function finish() {
        let upwell = new Upwell(UpwellMetadata.load(metadata), author);
        drafts.forEach((item) => {
          let { id, binary } = item;
          if (!upwell.metadata.isArchived(id) || id === upwell.metadata.main) {
            var start = new Date();
            let draft = Draft.load(id, binary, author.id);
            //@ts-ignore
            var end = new Date() - start;
            debug("(loadDoc): execution time %dms", end);
            upwell._drafts.set(draft.id, draft);
          }
        });
        resolve(upwell);
      }

      extract.on("entry", onentry);
      extract.on("finish", finish);

      stream.pipe(extract);
    });
  }

  serialize(): tar.Pack {
    let start = Date.now();
    let pack = tar.pack();
    let drafts = this.drafts();
    drafts.forEach((draft: Draft) => {
      writeDraft(draft.id, draft.save());
    });

    writeDraft(this.rootDraft.id, this.rootDraft.save())

    function writeDraft(id, binary: Uint8Array) {
      pack.entry({ name: `${id}.${LAYER_EXT}` }, Buffer.from(binary));
    }

    pack.entry({ name: METADATA_KEY }, Buffer.from(this.metadata.doc.save()));
    pack.finalize();
    let end = Date.now() - start;
    debug("(serialize): execution time %dms", end);
    return pack;
  }

  static create(options?: UpwellOptions): Upwell {
    let id = options?.id || nanoid();
    let author = options?.author || UNKNOWN_AUTHOR;
    let draft = Draft.create(SPECIAL_ROOT_DOCUMENT, author.id);
    let metadata = UpwellMetadata.create(id);
    let upwell = new Upwell(metadata, author);
    upwell.add(draft)
    draft.parent_id = draft.id
    upwell.rootDraft = draft
    upwell.createDraft(); // always create an initial draft
    return upwell;
  }

  merge(other: Upwell) {
    let draftsToMerge = other.drafts();

    //merge drafts
    draftsToMerge.forEach((draft) => {
      try {
        let existing = this.get(draft.id);
        existing.merge(draft);
        this.add(existing)
      } catch (err) {
        this.add(draft);
      }
    });

    //merge metadata
    let theirs = other.metadata;
    let ours = this.metadata;
    ours.doc.merge(theirs.doc);
    this.metadata = ours;
    this.subscriber();
  }
}
