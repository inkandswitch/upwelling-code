/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React, { useEffect, useCallback, useState } from 'react'
import { useLocation } from 'wouter'
import { Comment, LayerMetadata, Layer, Author } from 'api'
//@ts-ignore
import debounce from 'lodash.debounce'
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
  let [epoch, setEpoch] = useState<number>(Date.now())

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

  const render = useCallback(() => {
    let upwell = documents.get(id)
    const layers = upwell.layers()
    setLayers(layers)

    let draft = upwell.get(layer.id)
    setLayer(draft.materialize())
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
  }, [id, layer.id, authorColors, setAuthorColors, props.author])

  useEffect(() => {
    // get remote changes on this draft on first load
    documents.sync(id).then(() => {
      setSyncState(SYNC_STATE.SYNCED)
      let upwell = documents.get(id)
      let draft = upwell.get(layer.id)
      setLayer(draft.materialize())
      render()
    })

    documents.connect(id, layer.id)

    // auto update root on first load if we need to
    let upwell = documents.get(id)
    let draft = upwell.get(layer.id)
    if (
      !draft.pinned &&
      draft.id !== upwell.rootLayer.id &&
      draft.parent_id !== upwell.rootLayer.id &&
      !upwell.isArchived(draft.id)
    ) {
      console.log('updating to root')
      upwell.updateToRoot(draft)
    }

    return () => {
      console.log('unmounting ')
      documents.disconnect()
    }
  }, [id, layer.id, render])

  const handleFileNameInputBlur = (
    e: React.FocusEvent<HTMLInputElement, Element>
  ) => {
    let draft = upwell.get(layer.id)
    draft.message = e.target.value
    onChangeMade()
  }

  // local changes
  function onChangeMade() {
    let draft = upwell.get(layer.id)
    setLayer(draft.materialize())
    render()

    documents
      .sync(props.id)
      .then(() => {
        setSyncState(SYNC_STATE.SYNCED)
      })
      .catch((err) => {
        setSyncState(SYNC_STATE.OFFLINE)
        console.error('failed to sync', err)
      })
  }

  let onTextChange = () => {
    if (rootId === layer.id) {
    } else {
      documents.updatePeers(id, layer.id)
      setSyncState(SYNC_STATE.LOADING)
      debouncedOnTextChange()
    }
  }

  let onArchiveComment = (comment: Comment) => {
    let draft = upwell.get(layer.id)
    draft.comments.archive(comment)
    onChangeMade()
  }

  let handleUpdateClick = () => {
    let draft = upwell.get(layer.id)
    upwell.updateToRoot(draft)
    setReviewMode(false)
    setEpoch(Date.now())
    onChangeMade()
  }

  const handleShareClick = (layer: Layer) => {
    if (
      // eslint-disable-next-line no-restricted-globals
      confirm("Do you want to share your layer? it can't be unshared.")
    ) {
      let upwell = documents.get(id)
      upwell.share(layer.id)
      onChangeMade()
    }
  }

  let handleMergeClick = () => {
    let upwell = documents.get(id)
    let draft = upwell.get(layer.id)
    upwell.setLatest(draft)
    setEpoch(Date.now())
    onChangeMade()
  }

  let debouncedOnTextChange = debounce((layer: Layer) => {
    onChangeMade()
  }, AUTOSAVE_INTERVAL)

  function createLayer() {
    let upwell = documents.get(id)
    let newLayer = upwell.createDraft()
    goToDraft(newLayer.id)
    onChangeMade()
  }

  function goToDraft(did: string) {
    let upwell = documents.get(id)
    if (did === 'latest') did = upwell.rootLayer.id
    let draft = upwell.get(did)
    setLayer(draft.materialize())
    setLocation(`/document/${id}#${did}`)
  }

  function pinDraft() {
    let draft = upwell.get(layer.id)
    draft.pinned = !draft.pinned
    onChangeMade()
  }

  let rootId = upwell.rootLayer.id
  const isLatest = rootId === layer.id
  const shouldUpdate = rootId !== layer.parent_id
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
        did={layer.id}
        handleShareClick={handleShareClick}
        epoch={epoch}
        goToDraft={goToDraft}
        colors={authorColors}
        layers={layers}
        id={id}
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
            {!isLatest && !upwell.isArchived(layer.id) && (
              <>
                <Button onClick={() => goToDraft('latest')}>View Latest</Button>{' '}
                »{' '}
                <Input
                  value={layer.message}
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                  onChange={(e) => {
                    e.stopPropagation()
                    setLayer({ ...layer, message: e.target.value })
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
            {isLatest || upwell.isArchived(layer.id) ? (
              <Button onClick={createLayer}>Create Draft</Button>
            ) : (
              <>
                <span
                  css={css`
                    gap: 20px;
                    display: flex;
                  `}
                >
                  <Button disabled={shouldUpdate} onClick={handleMergeClick}>
                    Merge to document
                  </Button>
                  {layer.pinned && (
                    <Button
                      disabled={!shouldUpdate}
                      onClick={handleUpdateClick}
                    >
                      Update from current
                    </Button>
                  )}
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

                <span>
                  fixed{' '}
                  <Button
                    css={css`
                      margin-bottom: 1ex;
                    `}
                    onClick={() => pinDraft()}
                  >
                    {layer.pinned ? 'on' : 'off'}
                  </Button>
                </span>
              </>
            )}
          </div>
        </div>

        <EditReviewView
          did={layer.id}
          epoch={epoch}
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
          marks={layer.marks}
          comments={layer.comments}
          onChange={onArchiveComment}
          upwell={upwell}
          colors={authorColors}
        />
      </div>
    </div>
  )
}
