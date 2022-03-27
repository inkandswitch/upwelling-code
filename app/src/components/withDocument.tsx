import React, { useState, useEffect } from 'react'
import { Upwell, Author } from 'api'
import { useLocation } from 'wouter'
import Documents from '../Documents'

let documents = Documents()

type DocumentProps = {
  id: string
  author: Author
  did?: string
}

export default function withDocument(
  WrappedComponent: any,
  props: DocumentProps
) {
  return function () {
    let [upwell, setUpwell] = useState<Upwell>()
    let [, setLocation] = useLocation()
    let { id, author } = props

    useEffect(() => {
      let unmounted = false
      let upwell: Upwell | undefined
      async function render() {
        try {
          upwell = documents.open(id)
          if (!unmounted) {
            setUpwell(upwell)
          }
        } catch (err) {}

        upwell = await documents.sync(id)
        if (!upwell) upwell = await documents.create(props.id, author)
        if (!unmounted) setUpwell(upwell)
      }

      render()
      return () => {
        unmounted = true
      }
    }, [id, author, setLocation])
    if (!upwell) return <div></div>

    return <WrappedComponent upwell={upwell} {...props} />
  }
}
