import { Upwell } from 'api';
import * as fs from './storage/localStorage'

let upwell: Upwell;

export default function init () {
  if (!upwell) upwell = new Upwell({fs})
  return upwell
}

