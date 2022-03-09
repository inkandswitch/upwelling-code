import React, { useState, useEffect, useCallback } from 'react'
import Documents from '../Documents'
import { Button } from './Button'
import { Upwell, Layer, Author } from 'api'
import { useLocation } from 'wouter'
import ClickableDraftList from './ClickableDraftList'

let documents = Documents()

type DraftListProps = {
  id: string
  author: Author
}

export default function DraftList(props: DraftListProps) {
  const { id, author } = props
  const [, setLocation] = useLocation()
  let [layers, setLayers] = useState<Layer[]>([])
  let [, setRoot] = useState<Layer>()

  let upwell = documents.get(id)

  const render = useCallback((upwell: Upwell) => {
    // find the authors
    let root = upwell.rootLayer
    const layers = upwell.layers()
    setRoot(root)
    setLayers(layers)
  }, [])

  useEffect(() => {
    let interval = setInterval(() => {
      documents
      .sync(props.id)
      .then((upwell) => {
        render(upwell)
      })

    }, 2000)
    return () => {
      clearInterval(interval)
    }
  })

  useEffect(() => {
    let upwell = documents.get(id)
    upwell.subscribe(() => {
      render(upwell)
    })
    render(upwell)
    return () => {
      documents.unsubscribe(id)
    }
  }, [id, render])

  function createDraft() {
    let draft = upwell.createDraft(author)
    let url = `/document/${id}/draft/${draft.id}`
    setLocation(url)
  }

  function goToDraft(did: string) {
    let url = `/document/${id}/draft/${did}`
    setLocation(url)
  }

  return (
    <div>
      <div>
        <Button onClick={createDraft}>Create Draft</Button>
      </div>
      <ClickableDraftList
        id={id}
        onLayerClick={(layer: Layer) => goToDraft(layer.id)}
        layers={layers.filter((l) => !upwell.isArchived(l.id))}
      />
    </div>
  )
}
