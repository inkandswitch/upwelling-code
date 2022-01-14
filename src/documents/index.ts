import Upwelling from './Upwelling'
import * as storage from '../storage/localStorage'
export * from './Upwelling'
export * from './AutomergeDoc'

let upwelling = new Upwelling(storage)

export default function get () {
  return upwelling
}
