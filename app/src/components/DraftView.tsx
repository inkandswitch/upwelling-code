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
import { Button } from './Button';
import { useLocation } from 'wouter';
import { TextareaInput } from './Input'

let documents = Documents()

type DraftViewProps = {
  id: string
  did: string
  root: Layer
  author: Author
}

const AUTOSAVE_INTERVAL = 3000

export default function DraftView(props: DraftViewProps) {
  const { id, did, author, root } = props
  let [, setLocation] = useLocation()
  let [authorColors, setAuthorColors] = useState<AuthorColorsType>({})
  let [sync_state, setSyncState] = useState<SYNC_STATE>(SYNC_STATE.SYNCED)
  let [rootId, setRoot] = useState<string>(root.id)
  let [reviewMode, setReviewMode] = React.useState<boolean>(false)

  let visible = [did]

  function onChange() {
    console.log('boop')
  }

  const render = useCallback(
    (upwell: Upwell) => {
      // find the authors
      let rootId = upwell.rootLayer.id
      const layers = upwell.layers().filter((l) => l.id !== rootId)
      setRoot(upwell.rootLayer.id)

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
    documents.save(props.id)
    documents
      .sync(props.id)
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
    let upwell = documents.get(id)
    upwell.subscribe(() => {
      console.log('rendering')
      render(upwell)
    })
    render(upwell)
    return () => {
      documents.unsubscribe(id)
    }
  }, [id, render])

  let onTextChange = () => {
    if (rootId === layer.id) {
      let draft = upwell.createDraft(author)
      let url = `/document/${id}/draft/${draft.id}`
      setLocation(url)
    } else {
      setSyncState(SYNC_STATE.LOADING)
      debouncedOnTextChange()
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
    layer.merge(root)
    layer.parent_id = root.id
    onChangeMade()
    setReviewMode(false)
  }

  let handleMergeClick = () => {
    upwell.rootLayer = layer
    onChangeMade()
  }

  let upwell = documents.get(id)
  let layer = upwell.get(did)

  let debouncedOnTextChange = debounce((layer: Layer) => {
    // this is saving every time text changes, do we want this??????
    onChangeMade()
  }, AUTOSAVE_INTERVAL)
  return (
    <div
      id="folio"
      css={css`
        height: 100vh;
        display: flex;
        flex-direction: row;
        padding: 30px;
        background: url('/wood.png');
      `}
    >
      <div id="middle"
        css={css`
        height: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;
        `}>

      <div id="top-bar"
        css={css`
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          padding-bottom: 20px;
          margin: 10px 0;
        `}>
        <SyncIndicator state={sync_state}></SyncIndicator>
        <Button onClick={() => setLocation(`/document/${id}/drafts`)}> Back to Drafts</Button>
          <TextareaInput css={css`
          color: white;
        `}
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

          <div>
          Track changes
          <button
            css={css`
              margin-bottom: 1ex;
            `}
            onClick={() => setReviewMode(!reviewMode)}
          >
            {reviewMode ? 'on' : 'off'}
          </button>

        
            {rootId === layer.id
              ? <div>This is the latest</div>
              : rootId !== layer.parent_id
                ? <Button css={css`
              `}
                  onClick={handleUpdateClick}
                >
                Update to Latest
              </Button>
             : <Button
            css={css`
            background-color: blue;
            color: white;
          `}
            onClick={handleMergeClick}
            >
              Set as Latest
            </Button>
        }
        </div>
      </div>


      <EditReviewView
        visible={visible}
        id={id}
        author={author}
        reviewMode={reviewMode}
        onChange={onTextChange}
      />
      </div>

    </div>
  )
}
