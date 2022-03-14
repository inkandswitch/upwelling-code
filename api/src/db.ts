import init, { ObjID, Automerge, loadDoc, create, Value, SyncMessage, SyncState } from 'automerge-wasm-pack'
import { v4 as uuid } from 'uuid';

const ROOT = '_root'

type CollectionRow = {
    id?: string
}

type Query = object
type QueryOptions = object

export class Collection<T extends CollectionRow> {
    name: string
    doc: Automerge
    
    constructor (doc: Automerge, name: string) {
        this.name = name
        this.doc = doc
        this.doc.set_object(ROOT, name, {})
    }

    private _getMap (): ObjID {
        let value = this.doc.value(ROOT, this.name)
        if (value && value[0] === 'map') {
            let map = value[1]
            return map
        }
        throw new Error('Collection not initialized.')
    }

    insert(data: T): string {
        let id = data.id || uuid()
        data.id = id
        let map = this._getMap()
        Object.keys(data).forEach(key => {
            let value = this.doc.value(map, id)
            let obj: ObjID
            if (value && value[0] === 'map') {
                obj = value[1]
            } else {
                obj = this.doc.set_object(map, id, {})
            }
            
            this.doc.set(obj, key, data[key])

            // create index
            let index = this.doc.value(map, `${key}=${data[key]}`)
            let list: ObjID
            if (!index || index[0] !== 'list') {
                list = this.doc.set_object(map, `${key}=${data[key]}`, [])
            } else {
                list = index[1]
            }
            let len = this.doc.length(list)
            this.doc.insert(list, len, id)
        })
        return id
    }

    get(id: string): T | undefined {
        let map = this._getMap()
        let value = this.doc.value(map, id) 
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

    query(criteria: Query, options?: QueryOptions): string[] {
        let map = this._getMap()
        let allMatches = []
        Object.keys(criteria).forEach(key => {
            let value = criteria[key]
            let exists = this.doc.value(map, `${key}=${value}`)
            if (exists && exists[0] === 'list') {
                let objId = exists[1]
                let list = this.doc.materialize(objId)
                allMatches = allMatches.concat(list)
            }

        })

        return allMatches
    }

    /*
    *observe(query: string): AsyncGenerator<T> {

    }

    */

}