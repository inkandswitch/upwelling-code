import { ChangeSet } from 'automerge-wasm-pack'
import { Author, Draft } from '..'
import Queue from '../Queue'
import RTC, { WebsocketSyncMessage } from './RTC'

export type Transaction = {
  changes?: ChangeSet[]
  author: Author
  cursor?: CursorPosition
}

export type CursorPosition = {
  start: number
  end: number
}

export interface DraftWebsocketMessage extends WebsocketSyncMessage {
  cursor?: CursorPosition
}

export class RealTimeDraft extends RTC<DraftWebsocketMessage> {
  draft: Draft
  transactions: Queue<Transaction> = new Queue()

  constructor(draft: Draft, author: Author) {
    super(draft.id, draft.doc, author)
    this.draft = draft
    this.author = author
    this.on('syncMessage', ({ heads, msg, opIds }) => {
      let textObj = this.draft.doc.get('_root', 'text')
      this.draft.subscriber && this.draft.subscriber(this.draft)
      if (textObj && textObj[0] === 'text' && opIds.indexOf(textObj[1]) > -1) {
        let newHeads = this.draft.doc.getHeads()
        let attribution = this.draft.doc.attribute(textObj[1], heads, [
          newHeads,
        ])
        this.transactions.push({
          author: msg.author,
          changes: attribution,
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
      method: 'CURSOR',
      cursor: pos,
    })
  }
}
