/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React, { useCallback, useState, useEffect } from 'react'
import DraftView from './DraftView'
import querystring from 'querystring'
import { Upwell, Draft, Author } from 'api'
import Debug from 'debug'
import { SYNC_STATE } from '../types'
import { SyncIndicator } from './SyncIndicator'
import { debounce } from 'lodash'
import NoDocument from './NoDocument'
import Input from './Input'
import Documents from '../Documents'
import { ReactComponent as User } from '../components/icons/User.svg'

let documents = Documents()

let log = Debug('withDocument')

const RETRY_TIMEOUT = 3000
const MAX_RETRIES = 4

type DocumentProps = {
  id: string
  author: Author
  did?: string
}

export default function DocumentWrapper(props: DocumentProps) {
  let [root, setRoot] = useState<Draft>()
  let [sync_state, setSyncState] = useState<SYNC_STATE>(SYNC_STATE.SYNCED)
  let [timedOut, setTimedOut] = useState<boolean>(false)
  let [hideProfile, setHideProfile] = useState<boolean>(true)
  let { id } = props

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
    }
  }, [id])

  const debouncedSync = React.useMemo(
    () =>
      debounce(() => {
        sync()
      }, 2000),
    [sync]
  )

  async function onDownloadUpwell(id: string) {
    let upwell = documents.get(id)
    let binary = await upwell.toFile()
    let a = document.createElement('a')
    a.download = 'MyDocument.upwell'
    let blob = new Blob([binary], { type: 'application/octet-stream' })
    a.setAttribute('href', window.URL.createObjectURL(blob))
    document.body.appendChild(a)
    a.click()
  }

  useEffect(() => {
    let unmounted = false
    let retries = 0
    let upwell: Upwell | undefined

    window.onhashchange = (ev) => {
      switch (window.location.hash) {
        case '#download':
          onDownloadUpwell(id)
          break
      }
    }

    async function render() {
      try {
        let query = querystring.parse(window.location.search.replace('?', ''))
        if (query.path) {
          documents.paths.set(id, query.path as string)
        }
        log('render function')
        try {
          // get from server
          await documents.sync(id)
          upwell = documents.get(id)
        } catch (err) {
          // get a document from local fs or memory
          upwell = await documents.open(id)
        }
        if (!unmounted && upwell) {
          log('getting rootDraft in main component')
          setRoot(upwell.rootDraft)
        }
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
        }
      }
    }

    render()
    return () => {
      unmounted = true
      documents.disconnect(id)
    }
  }, [id, sync])

  if (!root) {
    return (
      <NoDocument>
        <div css={css``}>{timedOut ? '404' : ''}</div>
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
          background: #f9f9fa;
        `}
      >
        <div
          css={css`
            padding: 2px;
            display: flex;
            z-index: 2;
            border-bottom: 5px solid
              ${documents.get(id).getAuthorColor(documents.author.id)};
            &:hover {
              cursor: pointer;
            }
          `}
        >
          <Input
            css={css`
              display: ${hideProfile ? 'none' : 'block'};
            `}
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
              upwell.metadata.updateAuthor(documents.author.id, newAuthor.name)
              documents.save(id)
            }}
            defaultValue={documents.author.name}
          />

          <User
            onClick={() => setHideProfile((p) => !p)}
            css={css`
              fill: black;
            `}
          />
          <div css={css``}>
            <div
              css={css`
                height: 5px;
                content: '';
                background: ${documents.upwell &&
                documents.upwell.getAuthorColor(documents.author.id)};
              `}
            ></div>
          </div>
        </div>
      </div>
      <div
        css={css`
          background: #f9f9fa;
        `}
      >
        {sync_state === SYNC_STATE.OFFLINE && (
          <SyncIndicator state={sync_state} />
        )}
      </div>

      {/* @ts-ignore */}
      <DraftView sync={debouncedSync} root={root} {...props} />
    </div>
  )
}
