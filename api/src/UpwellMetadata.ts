import * as Automerge from "automerge-wasm-pack"
import debug from "debug"

export class UpwellMetadata {
  doc: Automerge.Automerge

  constructor(doc: Automerge.Automerge) {
    if (!doc) throw new Error('doc required')
    this.doc = doc
  }

  static load(binary: Uint8Array): UpwellMetadata {
    return new UpwellMetadata(Automerge.loadDoc(binary))
  }

  static create(id: string, main_id: string): UpwellMetadata {
    debug(`creating metadata ${id}  ${main_id}`)
    let doc = Automerge.create()
    doc.set("_root", 'id', id) 
    doc.set("_root", 'main_id', main_id)
    doc.set("_root", 'archived', {})
    return new UpwellMetadata(doc)
  }

  private _getArchivedLayers(): Automerge.ObjID {
    let value = this.doc.value("_root", 'archived')
    let map;
    if (!value) {
      map = this.doc.set("_root", 'archived', {})
    } else if (value[0] === 'map') {
      map = value[1]
    } else {
      throw new Error('Archived property not a map')
    }
    return map
  }

  isArchived(id: string): boolean {
    let map = this._getArchivedLayers()
    let maybe = this.doc.value(map, id)
    if (maybe && maybe[0] === 'boolean') {
      return maybe[1]
    } else {
      return false
    }
  }

  archive(id: string) {
    let map = this._getArchivedLayers()
    this.doc.set(map, id, true, 'boolean')
  }

  get id(): string {
    let value = this.doc.value("_root", 'id')
    if (value) return value[1] as string
    else return ''
  }

  get main(): string {
    let value = this.doc.value("_root", 'main_id')
    if (value) return value[1] as string
    else return ''
  }

  set main (id: string) {
    this.doc.set("_root", 'main_id', id)
  }

}
