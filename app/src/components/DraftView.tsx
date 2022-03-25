/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React, { useEffect, useCallback, useState } from 'react'
import { useLocation } from 'wouter'
//@ts-ignore
import { DraftMetadata, Draft, Author } from 'api'
import Documents from '../Documents'
import { EditReviewView } from './EditReview'
import { SYNC_STATE } from '../types'
import { SyncIndicator } from './SyncIndicator'
import { Button } from './Button'
import Input from './Input'
import DraftsHistory from './DraftsHistory'
import CommentSidebar from './CommentSidebar'
import Contributors from './Contributors'

let documents = Documents()

type DraftViewProps = {
  id: string
  root: Draft
  author: Author
}

const AUTOSAVE_INTERVAL = 5000

export default function DraftView(props: DraftViewProps) {
  let { id, author } = props
  let [, setLocation] = useLocation()
  let [sync_state, setSyncState] = useState<SYNC_STATE>(SYNC_STATE.SYNCED)
  let [reviewMode, setReviewMode] = useState<boolean>(false)
  let [epoch, setEpoch] = useState<number>(Date.now())
  let upwell = documents.get(id)
  let did = getDraftHash()
  let maybeDraft

  try {
    maybeDraft = upwell.get(did)
  } catch (err) {
    maybeDraft = upwell.rootDraft
  }
  let [draft, setDraft] = useState<DraftMetadata>(maybeDraft.materialize())
  let [drafts, setDrafts] = useState<Draft[]>([])

  function getDraftHash() {
    return window.location.hash.replace('#', '')
  }

  const render = useCallback(() => {
    let upwell = documents.get(id)
    const drafts = upwell.drafts()
    setDrafts(drafts)
    let draftInstance = upwell.get(draft.id)
    setDraft(draftInstance.materialize())
    documents.connect(id, draft.id)

    return () => {
      documents.disconnect()
    }
  }, [id, draft.id])

  useEffect(() => {
    let interval = setInterval(() => {
      documents.sync(id).then(() => {
        setSyncState(SYNC_STATE.SYNCED)
      })
    }, AUTOSAVE_INTERVAL)
    return () => {
      clearInterval(interval)
    }
  }, [id, render])

  const handleTitleInputBlur = (
    e: React.FocusEvent<HTMLInputElement, Element>
  ) => {
    let draftInstance = upwell.get(draft.id)
    draftInstance.title = e.target.value
    onChangeMade()
  }

  const handleFileNameInputBlur = (
    e: React.FocusEvent<HTMLInputElement, Element>
  ) => {
    let draftInstance = upwell.get(draft.id)
    draftInstance.message = e.target.value
    onChangeMade()
  }

  const onChangeMade = useCallback(() => {
    documents
      .upwellChanged(props.id)
      .then(() => {
        setSyncState(SYNC_STATE.SYNCED)
      })
      .catch((err) => {
        setSyncState(SYNC_STATE.OFFLINE)
        console.error('failed to sync', err)
      })
  }, [props.id])

  useEffect(() => {
    let upwell = documents.get(id)
    let draftInstance = upwell.get(draft.id)
    if (
      !draftInstance.pinned &&
      draftInstance.id !== upwell.rootDraft.id &&
      draftInstance.parent_id !== upwell.rootDraft.id &&
      !upwell.isArchived(draftInstance.id)
    ) {
      upwell.updateToRoot(draftInstance)
      onChangeMade()
    }
  }, [id, draft.id, onChangeMade])

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
    if (rootId === draft.id) {
    } else {
      if (draft.contributors.indexOf(documents.author.id) === -1) {
        let upwell = documents.get(id)
        let draftInstance = upwell.get(draft.id)
        draftInstance.addContributor(documents.author.id)
        render()
      }
      documents.updatePeers(id, did)
      setSyncState(SYNC_STATE.LOADING)
    }
  }

  let onCommentChange = () => {
    console.log('comment change!')
  }

  const handleShareClick = (draft: DraftMetadata) => {
    if (
      // eslint-disable-next-line no-restricted-globals
      confirm("Do you want to share your draft? it can't be unshared.")
    ) {
      let upwell = documents.get(id)
      upwell.share(draft.id)
    }
  }

  let handleUpdateClick = () => {
    let draftInstance = upwell.get(draft.id)
    upwell.updateToRoot(draftInstance)
    onChangeMade()
    setReviewMode(false)
    setEpoch(Date.now())
  }

  let handleMergeClick = () => {
    let upwell = documents.get(id)
    let draft = upwell.get(did)
    upwell.setLatest(draft)
    setEpoch(Date.now())
    onChangeMade()
  }

  function createDraft() {
    let upwell = documents.get(id)
    let newDraft = upwell.createDraft()
    goToDraft(newDraft.id)
    onChangeMade()
  }

  function goToDraft(did: string) {
    let draft = upwell.get(did).materialize()
    setDraft(draft)
    setLocation(`/document/${id}#${draft.id}`)
  }

  let rootId = upwell.rootDraft.id
  const isLatest = rootId === draft.id
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
      <SyncIndicator state={sync_state}></SyncIndicator>
      <DraftsHistory
        did={did}
        epoch={epoch}
        goToDraft={goToDraft}
        drafts={drafts}
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
          <div
            css={css`
              display: flex;
              flex-direction: row;
              align-items: center;
              justify-content: space-between;
            `}
          >
            <div
              css={css`
                display: flex;
                align-items: baseline;
                column-gap: 12px;
              `}
            >
              <Input
                value={draft.title}
                placeholder={'Untitled Document'}
                onClick={(e) => {
                  e.stopPropagation()
                }}
                onChange={(e) => {
                  e.stopPropagation()
                  setDraft({ ...draft, title: e.target.value })
                }}
                onBlur={(e) => {
                  handleTitleInputBlur(e)
                }}
                css={css`
                  font-size: 1.1em;
                  font-weight: 600;
                `}
              />
              <select
                onChange={(e) => goToDraft(e.target.selectedOptions[0].value)}
              >
                <option
                  label="main"
                  value={upwell.rootDraft.id}
                  selected={upwell.rootDraft.id === draft.id}
                />
                {drafts.map((d) => (
                  <option
                    label={d.message}
                    value={d.id}
                    selected={d.id === draft.id}
                  />
                ))}
              </select>
              {isLatest || upwell.isArchived(did) ? (
                <Button onClick={createDraft}>Create Draft</Button>
              ) : (
                <>
                  <Button
                    disabled={rootId !== draft.parent_id}
                    onClick={handleMergeClick}
                  >
                    Merge
                  </Button>
                  {draft.shared ? (
                    '(Public Draft)'
                  ) : (
                    <Button
                      onClick={(e) => {
                        e.preventDefault()
                        handleShareClick(draft)
                      }}
                    >
                      Share
                    </Button>
                  )}
                </>
              )}
              <Input
                value={draft.message}
                onClick={(e) => {
                  e.stopPropagation()
                }}
                onChange={(e) => {
                  e.stopPropagation()
                  setDraft({ ...draft, message: e.target.value })
                }}
                onBlur={(e) => {
                  //@ts-ignore
                  handleFileNameInputBlur(e)
                }}
              />
            </div>
            <Contributors
              upwell={upwell}
              contributors={draft.contributors}
            ></Contributors>
          </div>
          <div
            css={css`
              display: flex;
              align-items: baseline;
              column-gap: 30px;
              justify-content: space-between;
              align-items: center;
            `}
          >
            {draft.id !== rootId && rootId !== draft.parent_id ? (
              <Button onClick={handleUpdateClick}>Pending changes</Button>
            ) : (
              <div></div>
            )}
            <div>
              <span
                css={css`
                  gap: 20px;
                  display: flex;
                `}
              ></span>
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
            </div>
          </div>
        </div>

        <EditReviewView
          did={draft.id}
          epoch={epoch}
          visible={[draft.id]}
          id={id}
          author={author}
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
          draft={draft}
          onChange={onCommentChange}
          upwell={upwell}
        />
      </div>
    </div>
  )
}
