import init, {
  Automerge,
} from "automerge-wasm-pack";
import { Draft, Author, Upwell, AuthorId } from "./";

export async function loadForTheFirstTimeLoL() {
  return new Promise<void>((resolve, reject) => {
    init().then(() => {
      resolve();
    });
  });
}

export type ChangeMetadata = {
  message: string;
  authorId: AuthorId;
};

export type Heads = string[];
export type Subscriber = (doc: DraftMetadata) => void;

export class DraftMetadata {
  id: string;
  doc: Automerge;
  instance?: Draft;
  _heads?: Heads = []

  subscriber: Subscriber = () => { };
  private ROOT: string

  constructor(id: string, upwell: Upwell) {
    this.id = id;
    this.doc = upwell.doc;
    this.ROOT = '/drafts/' + this.id
  }

  private _getAutomergeText(prop: string): string {
    let value = this.doc.value(this.ROOT, prop, this._heads);
    if (value && value[0] === "text") return this.doc.text(value[1], this._heads);
    else return "";
  }

  private _getValue(prop: string) {
    let value = this.doc.value('/drafts/' + this.id, prop, this._heads);
    if (value && value[0]) return value[1];
  }

  get shared() {
    return this._getValue("shared") as boolean;
  }

  set shared(value: boolean) {
    this.doc.set(this.ROOT, "shared", value);
  }

  get heads() {
    return this._getValue("heads")
  }

  get time(): number {
    return this._getValue("time") as number;
  }

  set time(value: number) {
    this.doc.set(this.ROOT, "time", value);
  }

  get message(): string {
    return this._getValue("message") as string;
  }

  set message(value: string) {
    this.doc.set(this.ROOT, "message", value);
  }

  get text(): string {
    return this._getAutomergeText("text");
  }

  get authorId(): AuthorId {
    return this._getValue("author") as AuthorId;
  }

  set archived(value: boolean) {
    this.doc.set(this.ROOT, "archived", value);
  }

  get archived(): boolean {
    return this._getValue("archived") as boolean;
  }

  get parent_id(): string {
    return this._getValue("parent_id") as string;
  }

  set parent_id(value: string) {
    this.doc.set(this.ROOT, "parent_id", value);
  }

  get author(): Author {
    return this.doc.materialize('/author') as Author
  }

  set author(author: Author) {
    this.doc.set_object(this.ROOT, 'author', author)
  }

  subscribe(subscriber: Subscriber) {
    this.subscriber = subscriber;
  }

}
