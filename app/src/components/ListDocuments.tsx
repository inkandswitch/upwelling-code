import React, { useState, useEffect } from 'react'
import { Upwell, Layer }  from 'api'
import Documents from '../Documents'

let documents: Upwell = Documents()

type Props = {
  list: Layer[]
}

export default function MaybeListDocuments() {
  let [list, setList] = useState<Layer[]>([])
  useEffect(() => {
    documents.layers().then((layers: Layer[]) => {
      setList(layers)
    })
  }, [])
  return <ListDocuments list={list} />
}

export function ListDocuments({ list }: Props) {
  return <div>
    <ul>
      {list.map((meta: Layer) => {
        return <li><a href={`/doc/${meta.id}`}>{meta.title}</a></li>
      })}
    </ul>
  </div>
}