import RTC, { WebsocketSyncMessage } from "./RTC";
import { Author, Upwell } from "..";

export class RealTimeUpwell extends RTC<WebsocketSyncMessage> {
  upwell: Upwell;

  constructor(upwell: Upwell, author: Author) {
    super(upwell.id, upwell.metadata.doc, author)
    this.upwell = upwell
    this.on('syncMessage', ({ heads }) => {

      let newHeads = this.upwell.metadata.doc.getHeads()
      if (!arrayEquals(newHeads, heads)) this.upwell.subscriber()
    })
  }
}

function arrayEquals(a, b) {
  return Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((val, index) => val === b[index]);
}