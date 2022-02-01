import Upwell from './Upwell'
import * as local from './storage/localStorage'
import * as http from './storage/http'
export * from './Upwell'
export * from './UpwellDoc'

let upwell = new Upwell (local, http)

export default function init () {
  return upwell
}
