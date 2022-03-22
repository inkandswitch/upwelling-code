import { SyncState, initSyncState, ChangeSet } from "automerge-wasm-pack";
import { Author, Draft } from "./";
import { nanoid } from "nanoid";
import Queue from "./Queue";

const STORAGE_URL = process.env.STORAGE_URL;
console.log(STORAGE_URL);

type WebsocketSyncMessage = {
  method: "OPEN" | "MESSAGE" | "BYE" | "CURSOR";
  peerId: string;
  message?: string;
  author: Author;
  cursor?: number;
};

export type Transaction = {
  changes?: ChangeSet[],
  author: Author,
  cursor?: CursorPosition
}
export type CursorPosition = number

const MAX_RETRIES = 5;

export class RealTimeDraft {
  draft: Draft;
  timeout: any;
  peerId: string = nanoid();
  author: Author;
  ws: WebSocket;
  peerStates = new Map<string, SyncState>();
  retries: number = 0;
  transactions: Queue<Transaction> = new Queue()

  constructor(draft: Draft, author: Author) {
    this.draft = draft;
    this.author = author
    this.ws = this.connect();
  }

  retry() {
    this.retries++;
    if (this.retries > MAX_RETRIES)
      return console.log("MAX RETRIES", this.retries);
    this.timeout = setTimeout(() => {
      console.log("Retrying");
      this.ws = this.connect();
    }, 1000);
  }

  connect() {
    if (!STORAGE_URL) throw new Error("no storage url");
    var httpProtocol = "http://";
    var wsProtocol = "ws://";
    if (window.location.protocol === "https:") {
      httpProtocol = "https://";
      wsProtocol = "wss://";
    }
    let url = STORAGE_URL.replace(httpProtocol, wsProtocol);
    url = `${url}/${this.draft.id}/connect/${this.peerId}`;
    let ws = new WebSocket(url);
    ws.onopen = () => {
      this.sendOpen();
      if (this.timeout) clearTimeout(this.timeout);
    };
    ws.onmessage = (msg) => {
      let value;
      try {
        value = JSON.parse(msg.data);
      } catch (err) {
        console.error("Invalid Websocket Message", msg);
        console.error("Original error", err);
        return;
      }
      switch (value.method) {
        case "OPEN":
          this.sendSyncMessage(value.peerId);
          break;
        case "MESSAGE":
          this.receiveSyncMessage(value);
          break;
        case "CURSOR":
          this.receiveCursorMessage(value)
          break;
        case "BYE":
          console.log('bye', value)
          break;
        default:
          throw new Error("No message matched");
      }
    };

    ws.onclose = () => {
      this.retry();
    };
    return ws;
  }

  send(msg: WebsocketSyncMessage) {
    try {
      this.ws.send(JSON.stringify(msg));
    } catch (err) {
      this.retry();
    }
  }

  sendOpen() {
    this.send({
      author: this.author,
      peerId: this.peerId,
      method: "OPEN",
    });
  }

  updatePeers() {
    let peers = this.peerStates.keys();

    for (let peerId of peers) {
      this.sendSyncMessage(peerId);
    }
  }

  receiveCursorMessage(msg: WebsocketSyncMessage) {
    this.transactions.push({
      author: msg.author,
      cursor: msg.cursor,
    })

  }

  sendCursorMessage(pos: CursorPosition) {
    this.send({
      author: this.author,
      peerId: this.peerId,
      method: "CURSOR",
      cursor: pos
    })

  }

  _getPeerState(peerId: string) {
    let state = this.peerStates.get(peerId);
    if (!state) {
      // This should never happen, we missed an OPEN
      // but it isn't a fatal error, just re-create it
      state = initSyncState();
      this.peerStates.set(peerId, state);
    }
    return state;
  }

  receiveSyncMessage(msg: WebsocketSyncMessage) {
    let state = this._getPeerState(msg.peerId);
    let heads = this.draft.doc.getHeads()
    if (!msg.message) {
      console.error("msg", msg);
      throw new Error("Malformed syncMessage");
    }
    let syncMessage = Uint8Array.from(Buffer.from(msg.message, "base64"));

    this.draft.receiveSyncMessage(state, syncMessage);
    // TODO: only call attribute if textObj was changed
    let newHeads = this.draft.doc.getHeads()
    let attribution = this.draft.doc.attribute('/text', heads, [newHeads])
    this.transactions.push({
      author: msg.author,
      changes: attribution
    })
    this.sendSyncMessage(msg.peerId);
  }

  sendSyncMessage(peerId: string) {
    let state = this._getPeerState(peerId);
    let syncMessage = this.draft.doc.generateSyncMessage(state);
    if (!syncMessage) return; // done
    let msg: WebsocketSyncMessage = {
      peerId: this.peerId,
      author: this.author,
      method: "MESSAGE",
      message: Buffer.from(syncMessage).toString("base64"),
    };
    this.send(msg);
  }

  destroy() {
    let msg: WebsocketSyncMessage = {
      author: this.author,
      peerId: this.peerId,
      method: "BYE",
    };
    this.send(msg);
    this.ws.close();
  }
}
