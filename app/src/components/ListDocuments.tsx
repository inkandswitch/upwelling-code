import React, { useState, useEffect } from 'react'
import Upwell, { LayerMetadata }  from 'upwell'

let documents = Upwell()

type Props = {
  list: LayerMetadata[]
}

export default function MaybeListDocuments() {
  let [list, setList] = useState<LayerMetadata[]>([])
  useEffect(() => {
    documents.list().then(value => {
      setList(value)
    })
  }, [])
  return <ListDocuments list={list} />
}

export function ListDocuments({ list }: Props) {
  return <div>
    <ul>
      {list.map((meta: LayerMetadata) => {
        return <li><a href={`/doc/${meta.id}`}>{meta.title}</a></li>
      })}
    </ul>
  </div>
}