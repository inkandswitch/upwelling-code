import React, { useState, useEffect } from 'react'
import { Upwell, Layer } from 'api'
import { useLocation } from 'wouter'
import Documents from '../Documents'

let documents = Documents()

type DocumentProps = {
  id: string,
  did?: string
}

export default function withDocument(
  WrappedComponent: any,
  props: DocumentProps
) {
  return function () {
    let [root, setRoot] = useState<Layer>()
    let [, setLocation] = useLocation()
    let { id } = props

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
          if (!upwell) upwell = await documents.create(props.id)
        } finally {
          if (!upwell) throw new Error('could not create upwell')
          if (!unmounted) setRoot(upwell.rootLayer)
        }

        if (props.did) {
          try {
            upwell.get(props.did)
            
          } catch (err) {
            setLocation(`/document/${props.id}/draft/latest`)
            console.error(err)
          }
        }
      }

      render()
      return () => {
        unmounted = true
      }
    }, [id, setLocation])

    if (!root) return <div>Loading..</div>
    return <WrappedComponent root={root} {...props} />
  }
}
