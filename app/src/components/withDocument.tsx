import React, { useState, useEffect } from 'react'
import { Upwell, Draft, Author } from 'api'
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
    let [root, setRoot] = useState<Draft>()
    let [, setLocation] = useLocation()
    let { id, author } = props

    useEffect(() => {
      let unmounted = false
      let upwell: Upwell | undefined
      async function render() {
        try {
          upwell = await documents.open(id)
          if (!unmounted && upwell) {
            console.log('getting rootDraft in main component')
            setRoot(upwell.rootDraft)
          }
        } catch (err) {}

        try {
          await documents.sync(id)
          upwell = documents.get(id)
        } catch (err) {
          console.error(err)
          if (!upwell) {
            console.log('creating upwell')
            upwell = await documents.create(props.id, author)
          }
        } finally {
          if (!upwell) throw new Error('could not create upwell')
          if (!unmounted) setRoot(upwell.rootDraft)
          documents.connectUpwell(id)
        }
      }

      render()
      return () => {
        unmounted = true
        documents.disconnect(id)
      }
    }, [id, author, setLocation])
    if (!root) return <div></div>

    return <WrappedComponent root={root} {...props} />
  }
}
