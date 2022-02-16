import { Upwell } from 'api';
import * as localStorage from './storage/localStorage'

let upwell: Upwell;

export default function init () {
  if (!upwell) upwell = new Upwell({ fs: localStorage })
  return upwell 
}