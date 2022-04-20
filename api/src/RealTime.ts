import { EventEmitter } from "events";
import { nanoid } from "nanoid";
import { ChangeSet, create, Automerge, SyncState, initSyncState } from "automerge-wasm-pack";
import { Author, Draft } from ".";
import Queue from "./Queue";

import debug from 'debug'

const log = debug('RTC')

const STORAGE_URL = process.env.STORAGE_URL;
console.log(STORAGE_URL);

const MAX_RETRIES = 5;

export type WebsocketSyncMessage = {
  method: string;
  peerId: string;
  message?: string;
  author: Author;
};

export class RealTime<T extends WebsocketSyncMessage> extends EventEmitter {
  id: string;
  ws: WebSocket;
  doc: Automerge;
  author: Author;
  destroyed: boolean = false;
  timeout: any;
  peerId: string = nanoid();
  peerStates = new Map<string, SyncState>();
  retries: number = 0;

  constructor(id: string, author: Author, doc?: Automerge) {
    super()
    this.id = id
    this.doc = doc || create()
    this.author = author
    this.ws = this.connect();
  }

  retry() {
    this.retries++;
    let sec = this.retries * 3000
    log(`Retrying in ${sec}ms`)
    this.timeout = setTimeout(() => {
      this.ws = this.connect();
    }, sec);
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
    if (!msg.message) {
      console.error("msg", msg);
      throw new Error("Malformed syncMessage");
    }
    let syncMessage = Uint8Array.from(Buffer.from(msg.message, "base64"));
    let heads = this.doc.getHeads()
    let opIds = this.doc.receiveSyncMessage(state, syncMessage);
    this.emit('syncMessage', { heads, msg, opIds })
    this.sendSyncMessage(msg.peerId);
  }

  updatePeers() {
    let peers = this.peerStates.keys();

    for (let peerId of peers) {
      this.sendSyncMessage(peerId);
    }
  }

  sendSyncMessage(peerId: string) {
    let state = this._getPeerState(peerId);
    let syncMessage = this.doc.generateSyncMessage(state);
    if (!syncMessage) {
      console.log('sync complete')
      this.emit('sync-complete')
      return; // done
    }
    let msg = {
      peerId: this.peerId,
      author: this.author,
      method: "MESSAGE",
      message: Buffer.from(syncMessage).toString("base64"),
    };
    this.send(msg as T);
  }


  send(msg: T) {
    try {
      this.ws.send(JSON.stringify(msg));
    } catch (err) {
    }
  }

  sendOpen() {
    log('Opened', this.id)
    this.send({
      author: this.author,
      peerId: this.peerId,
      method: "OPEN",
    } as T);
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
    url = `${url}/${this.id}/connect/${this.peerId}`;
    let ws = new WebSocket(url);
    log('connecting to', this.id)
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
          this.emit('peer', value)
          this.sendSyncMessage(value.peerId);
          break;
        case "MESSAGE":
          this.receiveSyncMessage(value);
          break;
        case "BYE":
          log('BYE', value)
          this.emit('peer-disconnect', value)
          break;
        default:
          this.emit('message', value)
      }
    };


    ws.onclose = () => {
      console.log('ws closed')
      if (!this.destroyed) this.retry()
    };
    return ws;
  }

  destroy() {
    let msg = {
      author: this.author,
      peerId: this.peerId,
      method: "BYE",
    };
    this.send(msg as T);
    this.destroyed = true
    this.ws.close();
  }

}

export type Transaction = {
  changes?: ChangeSet[],
  author: Author,
  cursor?: CursorPosition
}

export type CursorPosition = {
  start: number,
  end: number
}

export interface DraftWebsocketMessage extends WebsocketSyncMessage {
  cursor?: CursorPosition;
}


export class RealTimeDraft extends RealTime<DraftWebsocketMessage> {
  draft: Draft;
  transactions: Queue<Transaction> = new Queue()

  constructor(draft: Draft, author: Author) {
    super(draft.id, author, draft.doc)
    this.draft = draft;
    this.author = author
    this.on('syncMessage', ({ heads, msg, opIds }) => {
      let textObj = this.draft.doc.value('_root', 'text')
      this.draft.subscriber && this.draft.subscriber(this.draft);
      if (textObj && textObj[0] === 'text' && opIds.indexOf(textObj[1]) > -1) {
        let newHeads = this.draft.doc.getHeads()
        let attribution = this.draft.doc.attribute(textObj[1], heads, [newHeads])
        this.transactions.push({
          author: msg.author,
          changes: attribution
        })
      }

      if (opIds.length > 0) {
        this.emit('data')
      }
    })

    this.on('message', (value: DraftWebsocketMessage) => {
      if (value.method === 'CURSOR') {
        this.receiveCursorMessage(value)
      }
    })
  }

  receiveCursorMessage(msg: DraftWebsocketMessage) {
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
}