/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React, { useEffect, useCallback, useState } from 'react'
import { useLocation } from 'wouter'
//@ts-ignore
import debounce from 'lodash.debounce'
import { LayerMetadata, Layer, Author } from 'api'
import { AuthorColorsType } from './ListDocuments'
import Documents from '../Documents'
import { EditReviewView } from './EditReview'
import { SYNC_STATE } from '../types'
import { SyncIndicator } from './SyncIndicator'
import deterministicColor from '../color'
import { Button } from './Button'
import Input from './Input'
import DraftsHistory from './DraftsHistory'
import CommentSidebar from './CommentSidebar'

let documents = Documents()

type DraftViewProps = {
  id: string
  root: Layer
  author: Author
}

const AUTOSAVE_INTERVAL = 3000

export default function DraftView(props: DraftViewProps) {
  let { id, author } = props
  let [, setLocation] = useLocation()
  let [authorColors, setAuthorColors] = useState<AuthorColorsType>({})
  let [sync_state, setSyncState] = useState<SYNC_STATE>(SYNC_STATE.SYNCED)
  let [reviewMode, setReviewMode] = useState<boolean>(false)
  let upwell = documents.get(id)
  let did = getDraftHash()
  let maybeLayer
  try {
    maybeLayer = upwell.get(did)
  } catch (err) {
    maybeLayer = upwell.rootLayer
  }
  let [layer, setLayer] = useState<LayerMetadata>(maybeLayer.materialize())
  let [layers, setLayers] = useState<Layer[]>([])

  function getDraftHash() {
    return window.location.hash.replace('#', '')
  }

  useEffect(() => {
    documents.connect(id, layer.id)

    return () => {
      documents.disconnect()
    }
  }, [id, layer.id])

  const render = useCallback(() => {
    let upwell = documents.get(id)
    const layers = upwell.layers()
    setLayers(layers)

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
  }, [id, authorColors, setAuthorColors, props.author])

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

  const handleFileNameInputBlur = (
    e: React.FocusEvent<HTMLInputElement, Element>
  ) => {
    let draft = upwell.get(layer.id)
    draft.message = e.target.value
    onChangeMade()
  }

  function onChangeMade() {
    documents
      .upwellChanged(props.id)
      .then(() => {
        render()
        setSyncState(SYNC_STATE.SYNCED)
      })
      .catch((err) => {
        render()
        setSyncState(SYNC_STATE.OFFLINE)
        console.error('failed to sync', err)
      })
  }

  useEffect(() => {
    let upwell = documents.get(id)
    upwell.subscribe(() => {
      render()
    })
    render()
    return () => {
      upwell.unsubscribe()
    }
  }, [id, render])

  let onTextChange = () => {
    if (rootId === layer.id) {
    } else {
      documents.updatePeers(id, did)
      debouncedOnTextChange()
      setSyncState(SYNC_STATE.LOADING)
    }
  }

  let onCommentChange = () => {
    console.log('comment change!')
  }

  console.log('rendering?')
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
    let draft = upwell.get(layer.id)
    draft.merge(root)
    draft.message = message
    draft.parent_id = root.id
    setLayer(draft.materialize())
    onChangeMade()
    setReviewMode(false)
  }

  let handleMergeClick = () => {
    let upwell = documents.get(id)
    let layer = upwell.get(did)
    upwell.setLatest(layer)
    setLayer(upwell.rootLayer.materialize())
    onChangeMade()
  }

  let debouncedOnTextChange = debounce((layer: Layer) => {
    // this is saving every time text changes, do we want this??????
    onChangeMade()
  }, AUTOSAVE_INTERVAL)

  function createLayer() {
    let upwell = documents.get(id)
    let newLayer = upwell.createDraft()
    goToDraft(newLayer.id)
    onChangeMade()
  }

  function goToDraft(did: string) {
    let layer = upwell.get(did).materialize()
    setLayer(layer)
    render()
    setLocation(`/document/${id}#${layer.id}`)
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
      <DraftsHistory goToDraft={goToDraft} layers={layers} id={id} />
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
            <button onClick={() => goToDraft(upwell.rootLayer.id)}>
              Latest
            </button>
            {!isLatest && (
              <>
                {' '}
                »{' '}
                <Input
                  value={layer.message}
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                  onChange={(e) => {
                    e.stopPropagation()
                  }}
                  onBlur={(e) => {
                    //@ts-ignore
                    handleFileNameInputBlur(e)
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
          visible={[layer.id]}
          id={id}
          author={author}
          colors={authorColors}
          reviewMode={reviewMode}
          onChange={onTextChange}
        />
      </div>
      <div
        id="comments"
        css={css`
          width: 20vw;
          background: rgba(0, 0, 0, 0.2);
          color: white;
          padding: 10px;
        `}
      >
        <CommentSidebar
          layer={layer}
          onChange={onCommentChange}
          upwell={upwell}
          colors={authorColors}
        />
      </div>
    </div>
  )
}
