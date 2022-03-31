import RTC, { WebsocketSyncMessage } from "./RTC";
import { Author, Upwell } from "..";

import debug from "debug";

let log = debug('RTCUpwell')

export class RealTimeUpwell extends RTC<WebsocketSyncMessage> {
  upwell: Upwell;

  constructor(upwell: Upwell, author: Author) {
    super(upwell.id, upwell.metadata.doc, author)
    this.upwell = upwell
    this.on('syncMessage', ({ opIds }) => {
      if (opIds.length) {
        this.emit('data')
      }
    })
  }

  sendChangedMessage() {
    this.send({
      author: this.author,
      peerId: this.peerId,
      method: "CHANGED",
    })
  }
}
