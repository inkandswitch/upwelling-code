import React, { useState, useEffect } from 'react'
import { Upwell, Layer }  from 'api'
import Documents from '../Documents'

let upwell: Upwell = Documents()

type Props = {
  list: Layer[]
}

export default function MaybeListDocuments() {
  let [list, setList] = useState<Layer[]>([])
  useEffect(() => {
    upwell.layers().then((layers: Layer[]) => {
      console.log('layers', layers)
      setList(layers)
    })
  }, [])
  return <ListDocuments list={list} />
}

export function ListDocuments({ list }: Props) {
  return <div>
    <ul>
      {list.map((meta: Layer) => {
        return <li><a href={`/layer/${meta.id}`}>{meta.title || 'Untitled'}</a></li>
      })}
    </ul>
  </div>
}