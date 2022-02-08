import React from 'react'
import { Layer }  from 'api'

type Props = {
  layers: Layer[]
}

export default function ListDocuments({ layers}: Props) {
  return <div>
    <ul>
      {layers.map((meta: Layer) => {
        return <li><a href={`/layer/${meta.id}`}>{meta.message}</a></li>
      })}
    </ul>
  </div>
}