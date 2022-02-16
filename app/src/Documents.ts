import { Upwell } from 'api';
import * as localStorage from './storage/localStorage'
import * as http from './storage/http'

let upwell: Upwell;

export default function init () {
  if (!upwell) upwell = new Upwell({ fs: localStorage, remote: http })
  return upwell 
}
