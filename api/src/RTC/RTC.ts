import { EventEmitter } from "events";
import { nanoid } from "nanoid";
import { SyncState, initSyncState } from "automerge-wasm-pack";
import { Automerge } from 'automerge-wasm-pack';
import { Author } from "..";

import debug from 'debug'

const log = debug('RTC')

const STORAGE_URL = process.env.STORAGE_URL;
console.log(STORAGE_URL);

const MAX_RETRIES = 5;

export type CursorPosition = {
  start: number,
  end: number
}

export type WebsocketSyncMessage = {
  method: string;
  peerId: string;
  message?: string;
  author: Author;
};

export default class RTC<T extends WebsocketSyncMessage> extends EventEmitter {
  id: string;
  ws: WebSocket;
  doc: Automerge;
  author: Author;
  timeout: any;
  peerId: string = nanoid();
  peerStates = new Map<string, SyncState>();
  retries: number = 0;

  constructor(id: string, doc: Automerge, author: Author) {
    super()
    this.id = id
    this.doc = doc
    this.author = author
    this.ws = this.connect();
  }

  retry() {
    this.retries++;
    log('Retrying in 3 seconds')
    this.timeout = setTimeout(() => {
      this.ws = this.connect();
    }, 3000);
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
    if (!syncMessage) return; // done
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
      this.retry();
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
      log('got syncMessage from peerId=', value.peerId)
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
      this.retry();
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
    this.ws.close();
  }

}