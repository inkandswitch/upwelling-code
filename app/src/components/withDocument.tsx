import React, { useState, useEffect } from 'react'
import { Upwell } from 'api'
import Documents from '../Documents'

let documents = Documents()

type DocumentProps = {
  id: string
}

export default function withDocument(
  WrappedComponent: any,
  props: DocumentProps
) {
  return function () {
    let [rootId, setRootId] = useState<string>()
    let { id } = props
    console.log(props)

    useEffect(() => {
      let upwell: Upwell
      async function render() {
        try {
          upwell = await documents.open(id)
          console.log('got upwell', upwell.layers())
        } catch (err) {}

        try {
          upwell = await documents.sync(id)
        } catch (err) {
          if (!upwell) upwell = await documents.create(props.id)
        } finally {
          if (!upwell) throw new Error('could not create upwell')
          let root = upwell.rootLayer()
          setRootId(root.id)
        }
      }

      render()
    }, [id])

    if (!rootId) return <div>Loading..</div>
    return <WrappedComponent {...props} />
  }
}
