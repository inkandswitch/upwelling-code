import * as React from 'react'
import Document from './Document'
import { ForkableDocument } from './ForkableDocument'
import * as storage from './storage/localStorage'

type AppProps = {
  id: string 
}

export default function App (props: AppProps) {
  let saved = storage.getDoc(props.id)
  let document
  if (saved) {
    document = ForkableDocument.load(saved)
  } else {
    document = ForkableDocument.create(props.id)
  }

  return <Document doc={document} />
}