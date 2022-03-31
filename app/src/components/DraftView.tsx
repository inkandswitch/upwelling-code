/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react/macro'
import React, { useEffect, useCallback, useState } from 'react'
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
import debug from 'debug'
import { debounce } from 'lodash'

const log = debug('DraftView')

let documents = Documents()

type DraftViewProps = {
  id: string
  root: Draft
  author: Author
}

export default function DraftView(props: DraftViewProps) {
  let { id, author } = props
  let [sync_state, setSyncState] = useState<SYNC_STATE>(SYNC_STATE.SYNCED)
  let [reviewMode, setReviewMode] = useState<boolean>(false)
  let [epoch, setEpoch] = useState<number>(Date.now())
  let upwell = documents.get(id)
  let [did, setDraftId] = useState<string>(getDraftHash())
  let maybeDraft
  try {
    maybeDraft = upwell.get(did)
  } catch (err) {
    maybeDraft = upwell.rootDraft
  }
  let [draft, setDraft] = useState<DraftMetadata>(maybeDraft.materialize())
  let [drafts, setDrafts] = useState<Draft[]>([])
  let [historyDraftId, setHistoryDraft] = useState<string>(upwell.rootDraft.id)

  function getDraftHash() {
    return window.location.hash.replace('#', '')
  }

  const render = useCallback(() => {
    let upwell = documents.get(id)
    let draftInstance = upwell.get(did)
    const drafts = upwell.drafts()
    setDrafts(drafts)
    setDraft(draftInstance.materialize())
    log('rendering', id, did)
  }, [id, did])

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
      render()
    }
  }, [id, render])

  const debouncedSync = React.useMemo(
    () =>
      debounce(() => {
        sync()
      }, 500),
    [sync]
  )

  useEffect(() => {
    sync()
  }, [id, sync])

  // every time the upwell id changes
  useEffect(() => {
    window.addEventListener('hashchange', () => {
      let id = getDraftHash()
      setDraftId(id)
    })
    documents.subscribe(id, (local: boolean) => {
      log('got notified of a change', id)
      if (local) render()
      debouncedSync()
    })
    return () => {
      documents.unsubscribe(id)
    }
  }, [id, debouncedSync, render])

  // every time the draft.id changes
  useEffect(() => {
    let upwell = documents.get(id)
    let draftInstance = upwell.get(draft.id)
    if (
      draftInstance.id !== upwell.rootDraft.id &&
      draftInstance.parent_id !== upwell.rootDraft.id &&
      !upwell.isArchived(draftInstance.id)
    ) {
      upwell.updateToRoot(draftInstance)
      documents.save(id)
    } else {
      render()
    }
    documents.connectDraft(id, draft.id)
    return () => {
      documents.disconnect(draft.id)
    }
  }, [id, draft.id, render])

  let debouncedOnTextChange = React.useMemo(
    () =>
      debounce(() => {
        let upwell = documents.get(id)
        if (upwell.rootDraft.id === draft.id) {
        } else {
          if (draft.contributors.indexOf(documents.author.id) === -1) {
            let draftInstance = upwell.get(draft.id)
            draftInstance.addContributor(documents.author.id)
            render()
          }
          console.log('syncing from onTextChange')
          documents.save(id)
        }
      }, 3000),
    [draft.contributors, id, render, draft.id]
  )

  let onTextChange = () => {
    setSyncState(SYNC_STATE.LOADING)
    documents.draftChanged(draft.id)
    debouncedOnTextChange()
  }

  let onCommentChange = () => {
    console.log('comment change!')
  }

  const handleTitleInputBlur = (
    e: React.FocusEvent<HTMLInputElement, Element>
  ) => {
    let draftInstance = upwell.get(draft.id)
    draftInstance.title = e.target.value
    documents.save(id)
  }

  const handleFileNameInputBlur = (
    e: React.FocusEvent<HTMLInputElement, Element>
  ) => {
    let draftInstance = upwell.get(draft.id)
    draftInstance.message = e.target.value
    documents.save(id)
  }

  const handleShareClick = (draft: DraftMetadata) => {
    if (
      // eslint-disable-next-line no-restricted-globals
      confirm("Do you want to share your draft? it can't be unshared.")
    ) {
      let upwell = documents.get(id)
      upwell.share(draft.id)
      documents.save(id)
    }
  }

  let handleUpdateClick = () => {
    window.location.reload()
  }

  let handleMergeClick = () => {
    let upwell = documents.get(id)
    upwell.rootDraft = upwell.get(draft.id)
    setEpoch(Date.now())
    documents.save(id)
  }

  function createDraft() {
    let upwell = documents.get(id)
    let newDraft = upwell.createDraft()
    documents.save(id)
    goToDraft(newDraft.id)
  }

  function goToDraft(did: string) {
    let draft = upwell.get(did).materialize()
    window.location.hash = draft.id
  }

  let rootId = upwell.rootDraft.id
  const isLatest = rootId === draft.id
  return (
    <div
      id="draft-view"
      css={css`
        height: 100vh;
        overflow: auto;
        display: flex;
        flex-direction: row;
        background: #f9f9fa;
        justify-content: space-between;
      `}
    >
      <SyncIndicator state={sync_state}></SyncIndicator>
      <DraftsHistory
        did={draft.id}
        epoch={epoch}
        goToDraft={goToDraft}
        drafts={drafts.map((d) => d.materialize())}
        setHistorySelection={(did) => setHistoryDraft(did)}
        id={id}
      />
      <div
        id="folio"
        css={css`
          width: 100%;
          display: flex;
          flex-direction: column;
          padding-right: 20px;
          max-width: 1000px;
        `}
      >
        <div
          id="top-bar"
          css={css`
            display: flex;
            flex-direction: column;
            row-gap: 10px;
            padding: 30px 0;
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
                value={draft.id}
              >
                <option label="main" value={upwell.rootDraft.id} />

                {drafts.map((d) => (
                  <option label={d.message} value={d.id} />
                ))}
              </select>
              {isLatest || upwell.isArchived(draft.id) ? (
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
              {!isLatest && (
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
              )}
            </div>
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
            <div
              css={css`
                gap: 20px;
                display: flex;
                flex-direction: row;
                align-items: baseline;
              `}
            >
              <Contributors upwell={upwell} contributors={draft.contributors} />
              <span>
                show changes{' '}
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
          historyDraftId={historyDraftId}
          onChange={onTextChange}
        />
      </div>
      <div
        id="comments"
        css={css`
          width: 20vw;
          min-width: 17vw;
          flex: 1 1 auto;
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
