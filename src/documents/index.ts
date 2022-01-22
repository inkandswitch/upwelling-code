import Documents from './Documents'
import * as local from '../storage/localStorage'
import * as http from '../storage/http'
export * from './Documents'
export * from './AutomergeDoc'

let d = new Documents(local, http)

export default function init () {
  return d 
}
