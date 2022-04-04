import { RTC } from 'api'
import HTTP from 'api/storage/http'
import debug from 'debug'
import RTC from 'api/src/RTC/RTC'

let log = debug('upwell:documents')

export class Documents {
  docs = new Map()

  constructor(author, storage_url) {
    this.author = author
    this.remote = new HTTP(storage_url)
  }

  has(id) {
    return this.doc.has(id)
  }

  disconnect(id) {
    let doc = this.docs.get(id)
    if (doc) {
      this.doc.destroy()
      this.docs.delete(id)
    }
  }

  connect(id, doc) {
    let doc = this.docs.get(id)
    if (!doc) {
      this.docs.set(id, new RTC(id, doc, this.author))
    }
  }
}
