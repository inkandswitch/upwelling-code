import { SyncState, initSyncState } from "automerge-wasm-pack";
import { Draft } from "./";
import { nanoid } from "nanoid";

const STORAGE_URL = process.env.STORAGE_URL;
console.log(STORAGE_URL);

type WebsocketSyncMessage = {
  method: "OPEN" | "MESSAGE" | "BYE";
  peerId: string;
  message?: string;
};

const MAX_RETRIES = 5;

export class RealTimeDraft {
  draft: Draft;
  timeout: any;
  peerId: string = nanoid();
  ws: WebSocket;
  peerStates = new Map<string, SyncState>();
  retries: number = 0;

  constructor(draft: Draft) {
    this.draft = draft;
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

    this.draft.receiveSyncMessage(state, syncMessage);
    this.sendSyncMessage(msg.peerId);
  }

  sendSyncMessage(peerId: string) {
    let state = this._getPeerState(peerId);
    let syncMessage = this.draft.doc.generateSyncMessage(state);
    if (!syncMessage) return; // done
    let msg: WebsocketSyncMessage = {
      peerId: this.peerId,
      method: "MESSAGE",
      message: Buffer.from(syncMessage).toString("base64"),
    };
    this.send(msg);
  }

  destroy() {
    let msg: WebsocketSyncMessage = {
      peerId: this.peerId,
      method: "BYE",
    };
    this.send(msg);
    this.ws.close();
  }
}
