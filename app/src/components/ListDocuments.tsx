import React from 'react'
import { Layer }  from 'api'

type Props = {
  layers: Layer[]
}

export default function ListDocuments({ layers}: Props) {

  let onLayerClick = (layer: Layer) => {
    layer.visible = true
    console.log(layers)

  }

  return <div>
    <ul>
      {layers.map((layer: Layer) => {
        return <li><button onClick={() => onLayerClick(layer)}>{layer.message}</button></li>
      })}
    </ul>
  </div>
}