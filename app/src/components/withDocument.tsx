/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React, { useCallback, useState, useEffect } from 'react'
import { Upwell, Draft, Author } from 'api'
import Debug from 'debug'
import { useLocation } from 'wouter'
import Documents from '../Documents'
import deterministicColor from '../color'
import { SYNC_STATE } from '../types'
import { SyncIndicator } from './SyncIndicator'
import { debounce } from 'lodash'
import NoDocument from './NoDocument'
import Input from './Input'

let documents = Documents()

let log = Debug('withDocument')

const RETRY_TIMEOUT = 3000
const MAX_RETRIES = 4

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
    let [timedOut, setTimedOut] = useState<boolean>(false)
    let { id, author } = props

    const sync = useCallback(async () => {
      setSyncState(SYNC_STATE.LOADING)
      try {
        await documents.sync(id)
        log('synced')
        setSyncState(SYNC_STATE.SYNCED)
        documents.rtcUpwell?.updatePeers()
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
      let retries = 0
      let upwell: Upwell | undefined
      async function render() {
        try {
          log('render function')
          upwell = await documents.open(id)
          if (!unmounted && upwell) {
            log('getting rootDraft in main component')
            setRoot(upwell.rootDraft)
          }
        } catch (err) {
          console.log(err)
        }

        try {
          await documents.sync(id)
          upwell = documents.get(id)
        } catch (err) {
          console.log(err)
          if (!upwell) {
            log('Retrying in', RETRY_TIMEOUT, retries)
            if (retries >= MAX_RETRIES) return setTimedOut(true)
            setTimeout(() => {
              log('retrying', retries)
              retries++
              if (retries <= MAX_RETRIES) render()
            }, RETRY_TIMEOUT)
          }
        } finally {
          if (upwell) {
            if (!unmounted) setRoot(upwell.rootDraft)
            documents.connectUpwell(id)
            sync()
          }
        }
      }

      render()
      return () => {
        unmounted = true
        documents.disconnect(id)
      }
    }, [id, author, setLocation, sync])

    if (!root) {
      return (
        <NoDocument>
          <div
            css={css`
              color: lightblue;
            `}
          >
            <h1>{timedOut ? 'timed out. bummer' : 'surfing...'}</h1>
            {timedOut ? (
              <img src="/Wavy2.gif" alt="404" />
            ) : (
              <img src="/Wavy2.gif" alt="Wave " />
            )}
          </div>
        </NoDocument>
      )
    }

    return (
      <div>
        <div
          css={css`
            top: 0;
            right: 0;
            position: fixed;
            margin: auto;
          `}
        >
          <div
            css={css`
              padding: 10px;
            `}
          >
            You are <SyncIndicator state={sync_state}></SyncIndicator>,{' '}
            <Input
              onClick={(e) => {
                e.stopPropagation()
              }}
              onChange={(e) => {
                e.stopPropagation()
              }}
              onBlur={(e) => {
                e.stopPropagation()
                let upwell = documents.get(id)
                documents.authorName = e.target.value

                let newAuthor = {
                  ...documents.author,
                  name: e.target.value,
                }
                upwell.author = newAuthor
                upwell.metadata.addAuthor(newAuthor)
                documents.save(id)
              }}
              defaultValue={documents.author.name}
            />
            <div
              css={css`
                background-color: white;
              `}
            >
              <div
                css={css`
                  height: 5px;
                  content: '';
                  background: ${deterministicColor(
                    documents.author.id
                  )?.toString()};
                `}
              ></div>
            </div>
          </div>
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
