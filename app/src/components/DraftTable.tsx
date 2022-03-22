import React, { useState, useEffect, useCallback } from 'react'
import Documents from '../Documents'
import { Button } from './Button'
import { Upwell, Draft, Author } from 'api'
import { useLocation } from 'wouter'
import ClickableDraftList from './ClickableDraftList'

let documents = Documents()

type DraftListProps = {
  id: string
  author: Author
}

export default function DraftList(props: DraftListProps) {
  const { id } = props
  const [, setLocation] = useLocation()
  let [drafts, setDrafts] = useState<Draft[]>([])
  let [, setRoot] = useState<Draft>()

  let upwell = documents.get(id)

  const render = useCallback((upwell: Upwell) => {
    // find the authors
    let root = upwell.rootDraft
    const drafts = upwell.drafts()
    setRoot(root)
    setDrafts(drafts)
  }, [])

  useEffect(() => {
    let interval = setInterval(() => {
      documents.sync(props.id).then((upwell) => {
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
    let draft = upwell.createDraft()
    let url = `/document/${id}#${draft.id}`
    setLocation(url)
  }

  function goToDraft(did: string) {
    let url = `/document/${id}#${did}`
    setLocation(url)
  }

  return (
    <div>
      <div>
        <Button onClick={createDraft}>Create Draft</Button>
      </div>
      <ClickableDraftList
        id={id}
        did={''}
        onDraftClick={(draft: Draft) => goToDraft(draft.id)}
        drafts={drafts.filter((l) => !upwell.isArchived(l.id))}
      />
    </div>
  )
}
