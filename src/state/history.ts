import { AppData, INITIAL_DATA, PERSIST_DATA } from './constants'
import { current } from 'immer'
import * as Automerge from 'automerge';
import { Buffer } from 'buffer/';

export function makeHistory(ID = 'v67') {
  let initialData: AppData = INITIAL_DATA

  const saved: string = localStorage.getItem(ID)

  if (PERSIST_DATA && saved) {
    let serializedDoc: Automerge.BinaryDocument = new Uint8Array(Buffer.from(saved, 'hex')) as Automerge.BinaryDocument
    let restoredData = Automerge.load<AppData>(serializedDoc)
    console.log(restoredData)

    if (restoredData.version < INITIAL_DATA.version) {
      // Migrations would go here
      initialData = INITIAL_DATA
    }
    initialData = restoredData
  } 

  let stack: AppData[] = [initialData]
  let pointer = 0

  function persist(data: AppData) {
    localStorage.setItem(ID, Buffer.from(Automerge.save(data)).toString('hex'))
  }

  function push(data: AppData) {
    if (pointer < stack.length - 1) {
      stack = stack.slice(0, pointer + 1)
    }
    const serialized = current(data)
    stack.push(serialized)
    pointer = stack.length - 1
    persist(serialized)
    return true
  }

  function undo() {
    if (pointer <= 0) return false
    pointer--
    const data = stack[pointer]
    persist(data)
    return data
  }

  function redo() {
    if (pointer >= stack.length - 1) return false
    pointer++
    const data = stack[pointer]
    persist(data)
    return data
  }

  function reset(data = INITIAL_DATA) {
    stack = [data]
    pointer = 0
    persist(data)
    return data
  }

  function restore() {
    return initialData
  }

  return { push, undo, redo, reset, restore }
}
