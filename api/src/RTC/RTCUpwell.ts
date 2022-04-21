import RTC, { WebsocketSyncMessage } from './RTC'
import { Author, Upwell } from '..'

import debug from 'debug'

let log = debug('RTCUpwell')

export class RealTimeUpwell extends RTC<WebsocketSyncMessage> {
  upwell: Upwell

  constructor(upwell: Upwell, author: Author) {
    super(upwell.id, upwell.metadata.doc, author)
    this.upwell = upwell
    this.on('syncMessage', ({ opIds, heads }) => {
      if (opIds.length) {
        log('triggering data event')
        this.emit('data', { opIds, heads })
      }
    })
  }
}
