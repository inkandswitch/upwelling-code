/** @jsxImportSource @emotion/react */
import React, { useState, useEffect, useCallback } from 'react'
import Documents from '../Documents'
import { Button } from './Button'
import { Upwell, Layer, Author } from 'api'
import { useLocation } from 'wouter'

let documents = Documents()

type DraftListProps = {
  id: string
  author: Author
}

export default function DraftList(props: DraftListProps) {
  const { id } = props
  const [, setLocation] = useLocation()
  let [layers, setLayers] = useState<Layer[]>([])
  let [, setRoot] = useState<Layer>()

  const render = useCallback((upwell: Upwell) => {
    // find the authors
    let root = upwell.rootLayer
    const layers = upwell.layers().filter((l) => l.id !== root.id)
    setRoot(root)
    setLayers(layers)
  }, [])

  useEffect(() => {
    let upwell = documents.get(id)
    upwell.subscribe(() => {
      console.log('rendering')
      render(upwell)
    })
    render(upwell)
    return () => {
      documents.unsubscribe(id)
    }
  }, [id, render])

  function createLayer() {
    let upwell = documents.get(id)
    let newLayer = upwell.createDraft()
    upwell.add(newLayer)
    let url = `/document/${id}/draft/${newLayer.id}`
    setLocation(url)
  }

  function goToLatest() {
    let upwell = documents.get(id)
    let latest = upwell.rootLayer
    let url = `/document/${id}/draft/${latest.id}`
    setLocation(url)
  }

  console.log(layers)
  return (
    <div>
      <div>
        <Button onClick={createLayer}>Create Draft</Button>
        <Button onClick={goToLatest}>Latest</Button>
      </div>
      {layers.map((l) => {
        return (
          <ul>
            <li>
              <a href={`/document/${id}/draft/${l.id}`}>{l.message}</a>
            </li>
          </ul>
        )
      })}
    </div>
  )
}
