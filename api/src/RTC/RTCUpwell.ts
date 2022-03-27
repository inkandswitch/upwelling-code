import RTC, { WebsocketSyncMessage } from "./RTC";
import { Author, Upwell } from "..";

export class RealTimeUpwell extends RTC<WebsocketSyncMessage> {
  upwell: Upwell;

  constructor(upwell: Upwell, author: Author) {
    super(upwell.id, upwell.doc, author)
    this.upwell = upwell
    this.on('syncMessage', ({ opIds }) => {
      if (opIds.length) {
        this.emit('data')
      }
    })
  }
}
