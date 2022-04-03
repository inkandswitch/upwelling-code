/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React, { useCallback, useState, useEffect } from 'react'
import { Upwell, Draft, Author } from 'api'
import Debug from 'debug'
import { useLocation } from 'wouter'
import Documents from '../Documents'
import { SYNC_STATE } from '../types'
import { SyncIndicator } from './SyncIndicator'
import { debounce } from 'lodash'

let documents = Documents()

let log = Debug('withDocument')

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
    let [sync_state, setSyncState] = useState<SYNC_STATE>(SYNC_STATE.SYNCED)
    let [epoch, setEpoch] = useState<number>(Date.now())
    let { id, author } = props

    const sync = useCallback(async () => {
      setSyncState(SYNC_STATE.LOADING)
      try {
        await documents.sync(id)
        log('synced')
        setSyncState(SYNC_STATE.SYNCED)
      } catch (err) {
        log('failed to sync', err)
        setSyncState(SYNC_STATE.OFFLINE)
      } finally {
        log('rendering')
        setEpoch(Date.now())
      }
    }, [id])

    const debouncedSync = React.useMemo(
      () =>
        debounce(() => {
          sync()
        }, 500),
      [sync]
    )

    useEffect(() => {
      let unmounted = false
      let upwell: Upwell | undefined
      async function render() {
        try {
          upwell = await documents.open(id)
          if (!unmounted && upwell) {
            log('getting rootDraft in main component')
            setRoot(upwell.rootDraft)
          }
        } catch (err) {}

        try {
          await documents.sync(id)
          upwell = documents.get(id)
        } catch (err) {
          console.error(err)
          if (!upwell) {
            log('creating upwell')
            upwell = await documents.create(props.id, author)
          }
        } finally {
          if (!upwell) throw new Error('could not create upwell')
          if (!unmounted) setRoot(upwell.rootDraft)
          documents.connectUpwell(id)
          sync()
        }
      }

      render()
      return () => {
        unmounted = true
        documents.disconnect(id)
      }
    }, [id, author, setLocation, sync])
    if (!root) return <div></div>

    return (
      <div>
        <div
          css={css`
            padding: 0px 10px;
            justify-content: space-between;
            width: 100%;
            background-color: #eeeee;
            color: white;
            display: flex;
            div {
              padding: 5px;
            }
          `}
        >
          <SyncIndicator state={sync_state}></SyncIndicator>
          <div>{documents.author.name}</div>
        </div>
        <WrappedComponent
          sync={debouncedSync}
          root={root}
          epoch={epoch}
          {...props}
        />
      </div>
    )
  }
}
