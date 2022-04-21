import init, {
  ObjID,
  Automerge,
  load,
  create,
  Value,
  SyncMessage,
  SyncState,
} from 'automerge-wasm-pack'
import { v4 as uuid } from 'uuid'

const ROOT = '_root'

type CollectionRow = {
  id?: string
}

type Query = object
type QueryOptions = object

export class Collection<T extends CollectionRow> {
  name: string
  doc: Automerge

  constructor(doc: Automerge, name: string) {
    this.name = name
    this.doc = doc
    try {
      this._getMap()
    } catch (err) {
      this.doc.putObject(ROOT, name, {})
    }
  }

  _getMap(): ObjID {
    let value = this.doc.get(ROOT, this.name)
    if (value && value[0] === 'map') {
      let map = value[1]
      return map
    }
    throw new Error('Collection not initialized.')
  }

  objects(): { [key: string]: T } {
    return this.doc.materialize(this._getMap())
  }

  insert(data: T): string {
    let id = data.id || uuid()
    data.id = id
    let map = this._getMap()
    Object.keys(data).forEach((key) => {
      let value = this.doc.get(map, id)
      let obj: ObjID
      if (value && value[0] === 'map') {
        obj = value[1]
      } else {
        obj = this.doc.putObject(map, id, {})
      }

      if (typeof data[key] === 'object') {
        this.doc.putObject(obj, key, data[key])
      } else {
        this.doc.put(obj, key, data[key])
      }
    })
    return id
  }

  get(id: string): T | undefined {
    let map = this._getMap()
    let value = this.doc.get(map, id)
    if (value && value[0] === 'map') {
      return this.doc.materialize(value[1])
    }
    return undefined
  }

  update(id: string, raw: any) {
    let data = this.get(id)
    if (!data) throw new Error('id doesnt exist')
    // only update the ones that are different
    return this.insert(Object.assign(data, raw))
  }
}
