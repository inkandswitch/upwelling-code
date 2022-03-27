import { RealTimeUpwell, Author, RealTimeDraft, Upwell, Draft, DraftMetadata } from '.'
import FS from './storage/localStorage'
import HTTP from './storage/http'
import debug from 'debug'

const STORAGE_URL = process.env.STORAGE_URL

let log = debug('upwell:documents')

console.log(STORAGE_URL)

function noop() { }

export class Documents {
  upwell?: Upwell
  drafts = new Map<string, Draft>()
  storage = new FS('upwell-')
  remote = new HTTP(STORAGE_URL)
  subscriptions = new Map<string, Function>()
  author: Author
  rtcUpwell?: RealTimeUpwell
  rtcDraft?: RealTimeDraft

  constructor(author: Author) {
    this.author = author
  }

  async createDraft() {
    if (!this.upwell) throw new Error('poop')
    let rootDraftInstance = this.getDraft(this.upwell.rootDraft.id)
    let newDraft = rootDraftInstance.fork(this.author)
    this.upwell.addDraft(newDraft)
    await this.saveDraft(newDraft)
    await this.syncDraft(newDraft.id)
    return newDraft
  }

  open(id) {
    let buf = this.storage.getItem(id)
    if (buf) {
      this.upwell = Upwell.load(buf, this.author)
      return this.upwell
    }
    throw new Error('no upwell with id=' + id)
  }

  async sync(id) {
    let buf = await this.remote.getItem(id)
    let remote
    let local = this.upwell
    if (buf) {
      remote = Upwell.load(Uint8Array.from(Buffer.from(buf)), this.author)
    }
    if (local && remote) {
      local.merge(remote)
      let buf = local.doc.save()
      this.storage.setItem(id, buf)
      await this.remote.setItem(id, buf)
      return local
    } else if (!local && remote) {
      this.upwell = remote
      this.storage.setItem(id, remote.doc.save())
      return this.upwell
    } else if (local && !remote) {
      await this.remote.setItem(id, local.doc.save())
      return this.upwell
    }
  }

  async create(id: string): Promise<Upwell> {
    let root = Draft.create(this.author)
    let upwell = Upwell.create(id, root)

    // always create a first draft
    let draft = root.fork(this.author)
    upwell.addDraft(draft)
    this.saveDraft(root)
    this.saveDraft(draft)

    this.upwell = upwell
    await this.save()
    return this.upwell
  }

  subscribe(id: string, fn: Function) {
    this.subscriptions.set(id, fn)
  }

  draftChanged(draft: Draft) {
    let did = draft.id
    if (this.rtcDraft && this.rtcDraft.draft.id === did) {
      this.rtcDraft.updatePeers()
    }
    this.notify(did)
    this.saveDraft(draft)
  }

  upwellChanged() {
    if (this.rtcUpwell) {
      log('updating peers')
      this.rtcUpwell.updatePeers()
    }
    this.notify('upwell')
    this.save()
  }

  disconnectUpwell() {
    if (this.rtcUpwell) {
      this.rtcUpwell.destroy()
      log('disconnecting')
      this.rtcUpwell = undefined
    }
  }

  disconnectDraft(id: string) {
    if (this.rtcDraft && this.rtcDraft.id === id) {
      this.rtcDraft.destroy()
      log('disconnecting')
      this.rtcDraft = undefined
    }
  }

  connectUpwell() {
    if (!this.upwell) throw new Error('Load upwell first')
    if (this.rtcUpwell) return
    this.rtcUpwell = new RealTimeUpwell(this.upwell, this.author)
    this.rtcUpwell.on('data', () => {
      this.notify('upwell')
    })
  }

  async getRemoteDraft(id: string) {
    let maybeDraftBuf = await this.remote.getItem(id)
    if (maybeDraftBuf) {
      let draft = Draft.load(id, Uint8Array.from(Buffer.from(maybeDraftBuf)), this.author)
      return draft
    }
  }

  async syncDraft(id: string) {
    let localDraft = this.getDraft(id)
    let remoteDraft = await this.getRemoteDraft(id)
    if (localDraft && remoteDraft) {
      localDraft.doc.merge(remoteDraft.doc)
      this.saveDraft(localDraft)
      await this.remote.setItem(id, localDraft.doc.save())
      return localDraft
    } else if (remoteDraft && !localDraft) {
      this.saveDraft(remoteDraft)
      return remoteDraft
    } else if (localDraft && !remoteDraft) {
      await this.remote.setItem(id, localDraft.doc.save())
      return localDraft
    }
    throw new Error('Could not find draft')
  }

  getDraft(id: string): Draft {
    if (!this.upwell) throw new Error('No upwell')
    let draft = this.drafts.get(id)
    if (draft) return draft
    let maybeLocal = this.storage.getItem(id)
    if (maybeLocal) {
      let instance = Draft.load(id, maybeLocal, this.author)
      this.drafts.set(id, instance)
      return instance
    }
    throw new Error('No draft with id=' + id)
  }

  async connectDraft(did: string) {
    let draft = await this.getDraft(did)
    if (this.rtcDraft) return
    this.rtcDraft = new RealTimeDraft(draft, this.author)
    return this.rtcDraft
  }

  unsubscribe(id: string) {
    this.subscriptions.delete(id)
  }

  notify(id: string, err?: Error) {
    let fn = this.subscriptions.get(id) || noop
    fn(err)
  }

  async saveDraft(draft: Draft) {
    let doc = this.drafts.set(draft.id, draft)
    this.storage.setItem(draft.id, Buffer.from(draft.doc.save()))
    this.notify(draft.id)
    this.draftChanged(draft)
    return doc
  }

  async save(): Promise<Upwell> {
    let doc = this.upwell
    if (!doc) throw new Error('No upwell')
    this.storage.setItem(doc.id, Buffer.from(doc.doc.save()))
    return doc
  }
}
