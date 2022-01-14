import Upwelling from './Documents'
import * as storage from '../storage/localStorage'
export * from './Documents'
export * from './AutomergeDoc'

let upwelling = new Upwelling(storage)

export default function get () {
  return upwelling
}
