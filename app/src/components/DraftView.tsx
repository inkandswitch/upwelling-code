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
import { useLocation } from 'wouter'
import Input from './Input'
import DraftsHistory from './DraftsHistory'
import A from './A'

let documents = Documents()

type DraftViewProps = {
  id: string
  did: string
  root: Layer
  author: Author
}

const AUTOSAVE_INTERVAL = 3000

export default function DraftView(props: DraftViewProps) {
  let { id, did, author, root } = props
  let [, setLocation] = useLocation()
  let [authorColors, setAuthorColors] = useState<AuthorColorsType>({})
  let [sync_state, setSyncState] = useState<SYNC_STATE>(SYNC_STATE.SYNCED)
  let [rootId, setRoot] = useState<string>(root.id)
  let [reviewMode, setReviewMode] = useState<boolean>(false)
  let [layers, setLayers] = useState<Layer[]>([])
  console.log('did', did)

  let upwell = documents.get(id)
  if (props.did === 'latest') {
    did = upwell.rootLayer.id
  }
  let layer = upwell.get(did)

  useEffect(() => {
    let upwell = documents.get(id)
    documents.connect(layer)

    return () => {
      documents.disconnect()
    }
  }, [id, did])

  const render = useCallback(
    async (upwell: Upwell) => {
      // find the authors
      const layers = upwell.layers()
      setRoot(upwell.rootLayer.id)
      setLayers(layers)

      const newAuthorColors = { ...authorColors }
      let changed = false
      layers.forEach((l) => {
        if (!(l.author in authorColors)) {
          newAuthorColors[l.author] = deterministicColor(l.author)
          changed = true
        }
      })
      // also add this user in case they haven't made a layer
      if (!(props.author in authorColors)) {
        newAuthorColors[props.author] = deterministicColor(props.author)
        changed = true
      }
      if (changed) {
        setAuthorColors((prevState: any) => {
          return { ...prevState, ...newAuthorColors }
        })
      }
    },
    [authorColors, setAuthorColors, props.author]
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
      let draft = upwell.createDraft(author)
      let url = `/document/${id}/draft/${draft.id}`
      setLocation(url)
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
    upwell.archive(upwell.rootLayer.id)
    upwell.rootLayer = layer
    onChangeMade()
  }

  let debouncedOnTextChange = debounce((layer: Layer) => {
    // this is saving every time text changes, do we want this??????
    onChangeMade()
  }, AUTOSAVE_INTERVAL)

  function createLayer() {
    let upwell = documents.get(id)
    let newLayer = upwell.createDraft(author)
    upwell.add(newLayer)
    let url = `/document/${id}/draft/${newLayer.id}`
    setLocation(url)
  }

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
      <DraftsHistory layers={layers} id={id} />
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
            align-items: flex-start;
          `}
        >
          <div>
            <SyncIndicator state={sync_state}></SyncIndicator>
            <A href={`/document/${id}/draft/${rootId}`}>Latest</A>
            {!isLatest && (
              <>
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
          {isLatest ? (
            <Button onClick={createLayer}>Create Draft</Button>
          ) : (
            <div
              css={css`
                display: inline-flex;
                align-items: baseline;
                column-gap: 30px;
              `}
            >
              <span>
                Track changes{' '}
                <button
                  css={css`
                    margin-bottom: 1ex;
                  `}
                  onClick={() => setReviewMode(!reviewMode)}
                >
                  {reviewMode ? 'on' : 'off'}
                </button>
              </span>
              {rootId === layer.id ? (
                <div>This is the latest</div>
              ) : rootId !== layer.parent_id ? (
                <Button css={css``} onClick={handleUpdateClick}>
                  Update to Latest
                </Button>
              ) : (
                <Button
                  css={css`
                    background-color: blue;
                    color: white;
                  `}
                  onClick={handleMergeClick}
                >
                  Set as Latest
                </Button>
              )}
            </div>
          )}
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
