/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React, { useEffect, useCallback, useState } from 'react'
//@ts-ignore
import debounce from 'lodash.debounce'
import { Upwell, Layer, Author } from 'api'
import { AuthorColorsType } from './ListDocuments'
import Documents from '../Documents'
import { EditReviewView } from './EditReview'
import { SYNC_STATE } from '../types'
import { SyncIndicator } from './SyncIndicator'
import deterministicColor from '../color'
import { Button } from './Button'
import Input from './Input'
import DraftsHistory from './DraftsHistory'

let documents = Documents()

type DraftViewProps = {
  id: string
  root: Layer
  author: Author
}

const AUTOSAVE_INTERVAL = 3000
const HISTORY_FETCH_SIZE = 5

export default function DraftView(props: DraftViewProps) {
  let { id, author, root } = props
  let [authorColors, setAuthorColors] = useState<AuthorColorsType>({})
  let [sync_state, setSyncState] = useState<SYNC_STATE>(SYNC_STATE.SYNCED)
  let [reviewMode, setReviewMode] = useState<boolean>(false)
  let [did, setDraftId] = useState<string>(window.location.hash.slice(1))
  let [layers, setLayers] = useState<Layer[]>([])
  let [history, setHistory] = useState<Layer[]>([])
  let [noMoreHistory, setNoMoreHistory] = useState<boolean>(false)
  let [fetchSize, setFetchSize] = useState<number>(HISTORY_FETCH_SIZE)

  let upwell = documents.get(id)
  if (did === 'latest') did = upwell.rootLayer.id
  let layer = upwell.get(did)

  const getHistory = useCallback(() => {
    let upwell = documents.get(id)
    const moreHistory: Layer[] = []
    for (let i = 0; i < fetchSize; i++) {
      let value = upwell.history.get(i)
      if (value) moreHistory.push(value)
    }
    setNoMoreHistory(upwell.history.length <= fetchSize)
    setHistory(moreHistory)
  }, [id, fetchSize])

  useEffect(() => {
    let upwell = documents.get(id)
    let layer = upwell.get(did)
    documents.connect(layer)

    return () => {
      documents.disconnect()
    }
  }, [id, did])

  const render = useCallback(
    (upwell: Upwell) => {
      const layers = upwell.layers()
      setLayers(layers)
      getHistory()

      // find the authors
      const newAuthorColors = { ...authorColors }
      let changed = false
      layers.forEach((l) => {
        if (!(l.authorId in authorColors)) {
          newAuthorColors[l.authorId] = deterministicColor(l.authorId)
          changed = true
        }
      })
      // also add this user in case they haven't made a layer
      if (!(props.author.id in authorColors)) {
        newAuthorColors[props.author.id] = deterministicColor(props.author.id)
        changed = true
      }
      if (changed) {
        setAuthorColors((prevState: any) => {
          return { ...prevState, ...newAuthorColors }
        })
      }
    },
    [getHistory, authorColors, setAuthorColors, props.author]
  )
  /*
  useEffect(() => {
    let interval = setInterval(() => {
      documents.sync(id).then((upwell) => {
        render(upwell)
        setSyncState(SYNC_STATE.SYNCED)
      })
    }, 2000)
    return () => {
      clearInterval(interval)
    }
  }, [id, render])
  */

  useEffect(() => {
    function handler() {
      setDraftId(window.location.hash.slice(1))
      let upwell = documents.get(id)
      render(upwell)
    }
    window.addEventListener('hashchange', handler)
    return () => {
      window.removeEventListener('hashchange', handler)
    }
  }, [id, render])

  const handleFileNameInputBlur = (
    e: React.FocusEvent<HTMLInputElement, Element>,
    l: Layer
  ) => {
    let upwell = documents.get(id)
    l.message = e.target.value
    upwell.set(l.id, l)
    onChangeMade()
  }

  function onChangeMade() {
    documents
      .upwellChanged(props.id)
      .then((upwell) => {
        render(upwell)
        setSyncState(SYNC_STATE.SYNCED)
      })
      .catch((err) => {
        setSyncState(SYNC_STATE.OFFLINE)
        console.error('failed to sync', err)
      })
  }

  useEffect(() => {
    upwell.subscribe(() => {
      render(upwell)
    })
    render(upwell)
    return () => {
      upwell.unsubscribe()
    }
  }, [upwell, render])

  let onTextChange = () => {
    if (rootId === layer.id) {
    } else {
      documents.updatePeers(id, did)
      debouncedOnTextChange()
      setSyncState(SYNC_STATE.LOADING)
    }
  }

  /*
  let handleShareClick = () => {
    let upwell = documents.get(id)
    upwell.share(l.id)
    onChangeMade()
  }
  */

  let handleUpdateClick = () => {
    let root = upwell.rootLayer
    let message = layer.message
    layer.merge(root)
    layer.message = message
    layer.parent_id = root.id
    onChangeMade()
    setReviewMode(false)
  }

  let handleMergeClick = () => {
    upwell.setLatest(layer)
    window.location.hash = 'latest'
    onChangeMade()
  }

  let debouncedOnTextChange = debounce((layer: Layer) => {
    // this is saving every time text changes, do we want this??????
    onChangeMade()
  }, AUTOSAVE_INTERVAL)

  function createLayer() {
    let upwell = documents.get(id)
    let newLayer = upwell.createDraft()
    upwell.add(newLayer)
    window.location.hash = newLayer.id
  }

  let rootId = upwell.rootLayer.id
  const isLatest = rootId === layer.id
  return (
    <div
      id="draft-view"
      css={css`
        height: 100vh;
        display: flex;
        flex-direction: row;
        background: url('/wood.png');
      `}
    >
      <DraftsHistory
        layers={layers}
        id={id}
        archivedLayers={history}
        onGetMoreClick={
          noMoreHistory
            ? undefined
            : () => {
                setFetchSize(fetchSize + HISTORY_FETCH_SIZE)
              }
        }
      />
      <div
        id="folio"
        css={css`
          height: 100%;
          width: 100%;
          display: flex;
          flex-direction: column;
          padding: 30px;
        `}
      >
        <div
          id="top-bar"
          css={css`
            display: flex;
            flex-direction: column;
            padding-bottom: 20px;
            margin: 10px 0;
            row-gap: 10px;
          `}
        >
          <div>
            <SyncIndicator state={sync_state}></SyncIndicator>
            <a href={`/document/${id}#latest`}>Latest</a>
            {!isLatest && (
              <>
                {' '}
                »{' '}
                <Input
                  defaultValue={layer.message}
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                  onChange={(e) => {
                    e.stopPropagation()
                  }}
                  onBlur={(e) => {
                    //@ts-ignore
                    handleFileNameInputBlur(e, layer)
                  }}
                />
              </>
            )}
          </div>
          <div
            css={css`
              display: inline-flex;
              align-items: baseline;
              column-gap: 30px;
              justify-content: space-between;
            `}
          >
            {isLatest || upwell.isArchived(did) ? (
              <Button onClick={createLayer}>Create Draft</Button>
            ) : (
              <>
                <span
                  css={css`
                    gap: 20px;
                    display: flex;
                  `}
                >
                  <Button
                    disabled={!rootId || rootId !== layer.parent_id}
                    onClick={handleMergeClick}
                  >
                    Merge to document
                  </Button>
                  <Button
                    disabled={!rootId || rootId === layer.parent_id}
                    onClick={handleUpdateClick}
                  >
                    Update from current
                  </Button>
                </span>
                <span>
                  view changes{' '}
                  <Button
                    css={css`
                      margin-bottom: 1ex;
                    `}
                    onClick={() => setReviewMode(!reviewMode)}
                  >
                    {reviewMode ? 'on' : 'off'}
                  </Button>
                </span>
              </>
            )}
          </div>
        </div>

        <EditReviewView
          root={root}
          visible={[layer]}
          id={id}
          author={author}
          reviewMode={reviewMode}
          onChange={onTextChange}
        />
      </div>
      <div
        id="comments"
        css={css`
          background: black;
          color: white;
          opacity: 0.2;
          padding: 60px;
        `}
      >
        Comments
      </div>
    </div>
  )
}
