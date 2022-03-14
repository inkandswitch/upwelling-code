import { nanoid } from 'nanoid';
import init, { Automerge, loadDoc, create, Value, SyncMessage, SyncState } from 'automerge-wasm-pack'
import { Author } from './Upwell';
import { v4 as uuid } from 'uuid'

export async function loadForTheFirstTimeLoL() {
  return new Promise<void>((resolve, reject) => {
    init().then(() => {
      resolve()
    })
  })
}

const ROOT = '_root'

export type ChangeMetadata = {
  message: string,
  author: Author
}

export type Heads = string[];
export type LayerMetadata = {
  shared: boolean,
  parent_id: string,
  author: Author,
  message: string
}

export type Subscriber = (doc: Layer) => void 

export class LazyLayer {
  binary: Buffer
  id: string
  constructor(id: string, binary: Buffer) {
    this.binary = binary
    this.id = id 
  }

  hydrate() {
    return new Layer(this.id, loadDoc(this.binary))
  }
}

export class Block {
  id: string
  doc: Automerge
  type: string
  start: number
  end: number

  constructor({ id, doc, type, start, end }) {
    this.id = id
    this.doc = doc
    this.type = type
    this.start = start
    this.end = end
  }

  delete() {
    console.log('in delete', this.id)
    let blocksProp = this.doc.value(ROOT, 'blocks')
    if (!blocksProp || blocksProp[0] !== 'map') throw new Error('no blocks map')
    let blocksPropId = blocksProp[1]
    let block = this.doc.value(blocksPropId, this.id)
    if (block && block[0] === 'map') {
      let blockProp = block[1]
      console.log('setting ', blockProp, 'to true!')
      this.doc.set(blockProp, 'deleted', true, 'boolean')
    }
  }
}

export class Layer {
  id: string
  doc: Automerge
  private subscriber?: Subscriber 

  constructor(id: string, doc: Automerge) {
    this.id = id
    this.doc = doc
  }

  private _getAutomergeText(prop: string): string {
    let value = this.doc.value(ROOT, prop)
    if (value && value[0] === 'text') return this.doc.text(value[1])
    else return ''
  }

  private _getValue(prop: string) {
    let value = this.doc.value(ROOT, prop)
    if (value && value[0]) return value[1]
  }

  get shared () {
    return this._getValue('shared') as boolean;
  }

  set shared (value: boolean) {
    this.doc.set(ROOT, 'shared', value)
  }

  get version () {
    return this._getValue('version') as string;
  }

  set version (value: string) {
    this.doc.set(ROOT, 'version', value)
  }

  get time(): number {
    return this._getValue('time') as number
  }

  set time(value: number){
    this.doc.set(ROOT, 'time', value) 
  }

  get message (): string {
    return this._getValue('message') as string;
  }

  set message(value: string) {
    this.doc.set(ROOT, 'message', value)
  }

  get text (): string {
    return this._getAutomergeText('text')
  }

  get author(): Author {
    return this._getValue('author') as Author
  }

  get title (): string {
    return this._getAutomergeText('title')
  }

  get parent_id(): string {
    return this._getValue('parent_id') as string
  }

  set parent_id(value: string) {
    this.doc.set(ROOT, 'parent_id', value)
  }

  get metadata() : LayerMetadata {
    return {
      message: this.message,
      author: this.author,
      parent_id: this.parent_id,
      shared: this.shared
    }
  }

  receiveSyncMessage(state: SyncState, message: SyncMessage) {
    if (this.subscriber) this.subscriber(this)
    this.doc.receiveSyncMessage(state, message)
  }

  subscribe(subscriber: Subscriber) {
    this.subscriber = subscriber
  }

  insertAt(position: number, value: string | Array<string>, prop = 'text') {
    let obj = this.doc.value(ROOT, prop)
    if (obj && obj[0] === 'text') return this.doc.splice(obj[1], position, 0, value)
    else throw new Error('Text field not properly initialized')
  }

  deleteAt(position: number, count: number = 1, prop = 'text') {
    let obj = this.doc.value(ROOT, prop)
    if (obj && obj[0] === 'text') return this.doc.splice(obj[1], position, count, '')
    else throw new Error('Text field not properly initialized')
  }

  mark(name: string, range: string, value: Value, prop = 'text') {
    let obj = this.doc.value(ROOT, prop)
    if (obj && obj[0] === 'text') return this.doc.mark(obj[1], range, name, value)
    else throw new Error('Text field not properly initialized')
  }

  getMarks(prop = 'text') {
    let obj = this.doc.value(ROOT, 'text')
    if (obj && obj[0] === 'text') return this.doc.raw_spans(obj[1])
    else throw new Error('Text field not properly initialized')
  }

  get marks () {
    return this.getMarks()
  }

  insertBlock(position: number, type: string) {
    let blocksProp = this.doc.value(ROOT, 'blocks')
    if (!blocksProp || blocksProp[0] !== 'map') throw new Error('no blocks map')
    let blocksPropId = blocksProp[1]
    let blockUuid = uuid()
    let blockObj = this.doc.make(blocksPropId, blockUuid, {}, 'map')
    this.doc.set(blockObj, 'type', type)
    this.mark('block', `[${position}..${position}]`, `${blockUuid}`)
  }

  // TODO refactor this to use materialize or whatever because there is some
  // nasty hoop-jumping here.
  get blocks() {
    let blockMetadataObj = this.doc.value(ROOT, 'blocks')
    if (!blockMetadataObj || blockMetadataObj[0] !== 'map') throw new Error('no blocks map')
    let blockMetadataProp = blockMetadataObj[1]

    let getBlockMetadata = (blockId, prop) => {
      let blockMetadata = this.doc.value(blockMetadataProp, blockId)
      if (blockMetadata && blockMetadata[0] === 'map') {
        let blockProp = blockMetadata[1]
        let val = this.doc.value(blockProp, prop)
        if (val) return val[1]
      }
    }

    let blockMarks = this.marks
      .filter(m => m.name !== 'block')
      .filter(m => !getBlockMetadata(m.value, 'deleted'))
      .sort((m, n) => m.start - n.start)
    console.log('blockmarks', blockMarks)
    let blocks: any[] = []

    for (let i = 0; i < blockMarks.length; i++) {
      let start = blockMarks[i].start
      let end = i === blockMarks.length - 1 ? this.text.length : blockMarks[i + 1].start
      let type = getBlockMetadata(blockMarks[i].value, 'type')

      let block = new Block({
        id: blockMarks[i].value,
        doc: this.doc,
        type,
        start,
        end
      })

      if (start < end) blocks.push(block)
    }

    console.log('blocks?', blocks)
    return blocks
  }

  save (): Uint8Array {
    return this.doc.save()
  }

  fork(message: string, author: Author): Layer {
    let id = nanoid()
    let doc = this.doc.fork()
    doc.set(ROOT, 'message', message)
    doc.set(ROOT, 'author', author)
    doc.set(ROOT, 'shared', false)
    doc.set(ROOT, 'time', Date.now())
    doc.set(ROOT, 'archived', false)
    doc.set(ROOT, 'parent_id', this.id)
    return new Layer(id, doc)
  }

  merge(theirs: Layer) {
    this.doc.merge(theirs.doc)
  }

  static mergeWithEdits(ours: Layer, ...theirs: Layer[]) {
    // Fork the comparison layer, because we want to create a copy, not modify
    // the original. It might make sense to remove this from here and force the
    // caller to do the fork if this is the behaviour they want in order to
    // parallel Layer.merge() behaviour.
    let newLayer = ours.fork('Merge', ours.author)
    let origHead = newLayer.doc.getHeads()

    // Merge all the passed-in layers to this one.
    theirs.forEach(layer => newLayer.merge(layer))

    // Now do a blame against the heads of the comparison layers.
    let heads = theirs.map(layer => layer.doc.getHeads())

    let obj = newLayer.doc.value(ROOT, 'text')
    if (!obj || obj[0] !== 'text') throw new Error('Text field not properly initialized')

    let blame = newLayer.doc.blame(obj[1], origHead, heads)

    // blame contains an array with an entry for each layer passed in above,
    // with edits (add, del) applied against newLayer's text. Convert those to marks!

    for (let i = 0; i < blame.length; i++) {
      let layer = theirs[i]
      let edits = blame[i]

      edits.add.forEach(edit => {
        let text = newLayer.text.substring(edit.start, edit.end)
        newLayer.mark(
          'insert',
          `(${edit.start}..${edit.end})`,
          JSON.stringify({
            author: layer.author,
            text
          })
        )
      })

      edits.del.forEach(edit => {
        newLayer.mark(
          'delete',
          `(${edit.pos}..${edit.pos})`,
          JSON.stringify({
            author: layer.author,
            text: edit.val
          })
        )
      })
    }

    newLayer.commit('Merge')

    return newLayer
  }

  static load(id: string, binary: Uint8Array): Layer {
    let doc = loadDoc(binary)
    let layer = new Layer(id, doc)
    return layer
  }

  static create(message: string, author: Author): Layer {
    let doc = create()
    let id = nanoid()
    doc.set(ROOT, 'message', message)
    doc.set(ROOT, 'author', author)
    doc.set(ROOT, 'shared', false, 'boolean')
    doc.set(ROOT, 'time', Date.now(), 'timestamp')
    doc.set(ROOT, 'archived', false, 'boolean')
    doc.make(ROOT, 'title', '')
    let text = doc.make(ROOT, 'text', ' ')
    let blocks = doc.make(ROOT, 'blocks', {}, 'map')
    let initialBlockId = uuid()
    let initialParagraph = doc.make(blocks, initialBlockId, {}, 'map')
    doc.set(initialParagraph, 'type', 'paragraph')
    doc.mark(text, '(0..0]', 'block', initialBlockId)
    let layer = new Layer(id, doc)
    return layer
  }

  commit(message: string): Heads {
    let meta: ChangeMetadata = { author: this.author, message }
    let heads = this.doc.commit(JSON.stringify(meta))
    if (this.subscriber) this.subscriber(this)
    return heads
  }
}
