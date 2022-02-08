import { Upwell } from 'api';
import * as localStorage from './storage/localStorage'
import * as http from './storage/http'

let documents: Upwell;

export default function init () {
  if (!documents) documents = new Upwell({ fs: localStorage, remote: http })
  return documents
}