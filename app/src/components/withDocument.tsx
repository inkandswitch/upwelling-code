import React, { useState, useEffect } from 'react'
import { Upwell, Layer, Author } from 'api'
import Documents from '../Documents'

let documents = Documents()

type DocumentProps = {
  id: string,
  author: Author
}

export default function withDocument(
  WrappedComponent: any,
  props: DocumentProps
) {
  return function () {
    let [root, setRoot] = useState<Layer>()
    let { id, author } = props

    useEffect(() => {
      let unmounted = false
      let upwell: Upwell
      async function render() {
        try {
          upwell = await documents.open(id)
          console.log('got upwell', upwell.layers())
        } catch (err) {}

        try {
          upwell = await documents.sync(id)
        } catch (err) {
          if (!upwell) upwell = await documents.create(props.id, author)
        } finally {
          if (!upwell) throw new Error('could not create upwell')
          if (!unmounted) setRoot(upwell.rootLayer)
        }
      }

      render()
      return () => {
        unmounted = true
      }
    }, [id, author])

    if (!root) return <div>Loading..</div>
    return <WrappedComponent root={root} {...props} />
  }
}
