import concat from "concat-stream";
import { Readable } from "stream";
import Debug from "debug";
import tar from "tar-stream";
import { Author, DraftId, Draft, Upwell } from '.'

type MaybeDraft = {
  id: DraftId;
  binary: Uint8Array;
};

const debug = Debug("upwell:serializer");
const LAYER_EXT = ".draft";
const METADATA_KEY = "metadata.automerge";

export function toFile(upwell: Upwell): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let pack = serialize(upwell);

    let toBinaryStream = concat((binary: Buffer) => {
      resolve(binary);
    });

    pack.pipe(toBinaryStream);
  });
}

export function deserialize(stream: Readable, author: Author): Promise<Upwell> {
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
      let upwell = new Upwell(metadata, author);
      drafts.forEach((item) => {
        let { id, binary } = item;
        if (!upwell.isArchived(id) || id === upwell.rootDraft.id) {
          var start = new Date();
          let draft = Draft.load(id, binary, author);
          //@ts-ignore
          var end = new Date() - start;
          debug("(loadDoc): execution time %dms", end);
          upwell._draftLayers.set(draft.id, draft);
        } else {
          upwell._archivedLayers.set(id, binary)
        }
      });
      resolve(upwell);
    }

    extract.on("entry", onentry);
    extract.on("finish", finish);

    stream.pipe(extract);
  });
}

export function serialize(upwell: Upwell): tar.Pack {
  let start = Date.now();
  let pack = tar.pack();
  pack.entry({ name: METADATA_KEY }, Buffer.from(upwell.doc.save()));
  pack.finalize();
  let end = Date.now() - start;
  debug("(serialize): execution time %dms", end);
  return pack;
}
