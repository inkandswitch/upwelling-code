import concat from "concat-stream";
import tar from "tar-stream";
import crypto from "crypto";
import { nanoid } from "nanoid";
import { Readable } from "stream";
import { getRandomDessert } from "random-desserts";
import Debug from "debug";
import History from "./History";
import { Layer } from "./Layer";
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

type MaybeLayer = {
  id: LayerId;
  binary: Uint8Array;
};
export type LayerId = string;

const debug = Debug("upwell");
const LAYER_EXT = ".layer";
const METADATA_KEY = "metadata.automerge";

export function createAuthorId() {
  return crypto.randomBytes(16).toString("hex");
}

// An Upwell is multiple layers
export class Upwell {
  _layers: Map<string, Layer> = new Map();
  metadata: UpwellMetadata;
  author: Author;
  subscriber: Function = function noop() {};
  _archived: Map<string, Uint8Array | Layer> = new Map();

  constructor(metadata: UpwellMetadata, author: Author) {
    this.metadata = metadata;
    this.author = author;
    this.metadata.addAuthor(author);
  }

  get id() {
    return this.metadata.id;
  }

  get rootLayer() {
    let rootId = this.metadata.main;
    return this.get(rootId);
  }

  get history(): History {
    return new History(this);
  }

  set rootLayer(layer: Layer) {
    // TODO: check to see that layer has been
    // effectively 'rebased' on the latest
    let oldRoot = this.metadata.main;
    this.metadata.main = layer.id;
    this.archive(oldRoot);

    this.subscriber();
  }

  subscribe(subscriber: Function) {
    this.subscriber = subscriber;
  }

  unsubscribe() {
    this.subscriber = function noop() {};
  }

  layers(): Layer[] {
    return Array.from(this._layers.values());
  }

  getAuthorName(authorId: AuthorId): string | undefined {
    let author = this.metadata.getAuthor(authorId);
    if (author) return author.name;
    else return undefined;
  }

  setLatest(layer) {
    layer.commit(layer.message);
    this.archive(layer.id);
    this.rootLayer = layer;
  }

  createDraft(message?: string) {
    if (!message) message = getRandomDessert() as string;
    let newLayer = this.rootLayer.fork(message, this.author);
    this.add(newLayer);
    return newLayer;
  }

  add(layer: Layer): void {
    this.set(layer.id, layer);
    this.subscriber();
  }

  share(id: string): void {
    let layer = this.get(id);
    layer.shared = true;
    this.set(id, layer);
    this.subscriber();
  }

  isArchived(id: string): boolean {
    return this.metadata.isArchived(id);
  }

  archive(id: string): void {
    if (this.isArchived(id)) return;
    let doc = this.get(id);
    this.metadata.archive(id);
    this._layers.delete(id);
    this._archived.set(id, doc);
    this.subscriber();
  }

  set(id: string, layer: Layer) {
    return this._layers.set(id, layer);
  }

  _coerceLayer(id, buf: Layer | Uint8Array): Layer {
    if (buf?.constructor.name === "Uint8Array")
      return Layer.load(id, buf as Uint8Array, this.author.id);
    else return buf as Layer;
  }

  get(id: string): Layer {
    let layer = this._layers.get(id);
    if (!layer) {
      let maybe = this._archived.get(id);
      if (!maybe) throw new Error("No layer with id=" + id);
      else return this._coerceLayer(id, maybe);
    }
    return layer;
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
      let layers: MaybeLayer[] = [];

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
            layers.push({
              id,
              binary: Uint8Array.from(binary),
            });
            next();
          });
        }
      }

      function finish() {
        let upwell = new Upwell(UpwellMetadata.load(metadata), author);
        layers.forEach((item) => {
          let { id, binary } = item;
          if (upwell.metadata.isArchived(id)) {
            upwell._archived.set(id, binary);
          } else {
            var start = new Date();
            let layer = Layer.load(id, binary, author.id);
            //@ts-ignore
            var end = new Date() - start;
            debug("(loadDoc): execution time %dms", end);
            upwell.add(layer);
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
    let layers = this.layers();
    layers.forEach((layer: Layer) => {
      writeLayer(layer.id, layer.save());
    });
    let archived = Array.from(this._archived.keys());
    archived.forEach((id) => {
      let buf = this._archived.get(id);
      if (!buf) return console.error("no buf");
      else if (buf.constructor.name === "Uint8Array")
        writeLayer(id, buf as Uint8Array);
      else writeLayer(id, (buf as Layer).save());
    });

    function writeLayer(id, binary: Uint8Array) {
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
    let layer = Layer.create(SPECIAL_ROOT_DOCUMENT, author.id);
    let metadata = UpwellMetadata.create(id, layer.id, author);
    let upwell = new Upwell(metadata, author);
    upwell.add(layer);
    upwell.archive(layer.id); // root is always archived
    upwell.createDraft(); // always create an initial draft
    return upwell;
  }

  merge(other: Upwell) {
    let layersToMerge = other.layers();

    //merge layers
    layersToMerge.forEach((layer) => {
      try {
        let existing = this.get(layer.id);
        existing.merge(layer);
      } catch (err) {
        this.add(layer);
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
